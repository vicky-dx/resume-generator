import { spawn, spawnSync } from "child_process";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { buildLatex, defaultStyleConfig } from "../src/lib/builder";
import { defaultEscaper } from "../src/lib/escaper";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We intentionally avoid shell-based `exec` for compilation to prevent
// command injection and to have finer control over stderr/stdout streams.

async function commandExists(cmd: string) {
    try {
        // Prefer a binary probe without shell parsing. Try common flags for version output.
        let res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
        if (res && typeof res.status === 'number' && res.status === 0) return true;
        res = spawnSync(cmd, ['-v'], { stdio: 'ignore' });
        if (res && typeof res.status === 'number' && res.status === 0) return true;
        return false;
    } catch (e) {
        return false;
    }
}

function runLatexmk(buildDir: string, texFilePath: string, signal?: AbortSignal, opts?: { haltOnError?: boolean }) {
    const args = [
        // Use xelatex as engine explicitly
        ...(opts?.haltOnError ? ["-halt-on-error"] : []),
        "-xelatex",
        "-interaction=nonstopmode",
        `-output-directory=${buildDir}`,
        texFilePath,
    ];

    return new Promise<void>((resolve, reject) => {
        const proc = spawn("latexmk", args, { stdio: ['ignore', 'pipe', 'pipe'] as any });
        let timedOut = false;

        // Kill after timeout to avoid hangs
        const timeoutMs = 30000; // 30s default
        const killTimer = setTimeout(() => {
            timedOut = true;
            try { proc.kill(); } catch (e) { }
        }, timeoutMs);

        if (signal) {
            signal.addEventListener('abort', () => {
                try { proc.kill(); } catch (e) { }
                const abortErr = new Error("Compilation Cancelled");
                abortErr.name = "AbortError";
                reject(abortErr);
            });
        }

        let output = '';
        proc.stdout.on('data', (chunk) => { output += chunk.toString(); });
        proc.stderr.on('data', (chunk) => { output += chunk.toString(); });
        proc.on('error', (err: any) => {
            clearTimeout(killTimer);
            reject(err);
        });
        proc.on('close', (code) => {
            clearTimeout(killTimer);
            if (timedOut) return reject(new Error('latexmk timed out'));
            if (code === 0) return resolve();
            // Non-zero exit -> treat as error and include output to aid debugging
            return reject(new Error(output || `latexmk exited with code ${code}`));
        });
    });
}
let currentAbortController: AbortController | null = null;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1680,
        height: 1000,
        title: "Resume Generator",
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            nodeIntegration: false,
            contextIsolation: true,
            // Enable sandbox and webSecurity in production. Allow relaxed settings in dev only.
            sandbox: !!process.env.VITE_DEV_SERVER_URL ? false : true,
            webSecurity: !!process.env.VITE_DEV_SERVER_URL ? false : true,
        },
    });

    // Remove the default File/Edit/View menu bar
    mainWindow.setMenu(null);

    // Load Vite dev server URL or the local file when packaged
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

app.disableHardwareAcceleration();
// Suppress Chromium/GPU verbose error logging in the terminal
app.commandLine.appendSwitch('log-level', '3');

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// --- IPC Handlers --- //

ipcMain.handle("open-json", async () => {
    if (!mainWindow) return { success: false, error: "No window" };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: "Open Resume JSON",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
        properties: ["openFile"]
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };
    try {
        const rawData = await fs.promises.readFile(filePaths[0], "utf-8");
        return { success: true, data: rawData, filePath: filePaths[0] };
    } catch (error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("save-json", async (event, content: string, defaultPath?: string) => {
    if (!mainWindow) return { success: false, error: "No window" };
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "Save Resume JSON",
        defaultPath: defaultPath || "resume.json",
        filters: [{ name: "JSON Files", extensions: ["json"] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    try {
        await fs.promises.writeFile(filePath, content, "utf-8");
        return { success: true, filePath };
    } catch (error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("generate-pdf", async (event, data: unknown, templateName: string = "classic.tex", styleConfig?: unknown) => {
    try {
        // 0. Cancel previous job if running
        if (currentAbortController) {
            console.log("Cancelling previous compilation job...");
            currentAbortController.abort();
        }
        currentAbortController = new AbortController();
        const { signal } = currentAbortController;

        // 1. Setup Build Directory with Unique Job Pattern
        const jobId = Date.now().toString();
        const buildDir = path.join(app.getPath("temp"), "resume-builder");
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir, { recursive: true });
        }

        // Clean up VERY old leftover files asynchronously so they don't bloat the temp drive
        fs.readdir(buildDir, (err, files) => {
            if (!err) {
                files.forEach(f => {
                    // Safety: do not remove files that belong to the current jobId
                    if (typeof jobId === 'string' && f.includes(jobId)) return;
                    const fp = path.join(buildDir, f);
                    fs.stat(fp, (e, stats) => {
                        // Delete files older than 1 hour to prevent breaking iframe and saving space
                        if (!e && stats.mtimeMs < Date.now() - 3600000) {
                            fs.unlink(fp, () => { });
                        }
                    });
                });
            }
        });

        // Templates directory: prefer packaged resources, fallback to dev path
        const packagedTemplates = path.join(process.resourcesPath || '', "templates");
        const devTemplates = path.join(app.getAppPath(), "../templates");
        const templatesDir = fs.existsSync(packagedTemplates) ? packagedTemplates : devTemplates;

        const finalStyle = { ...defaultStyleConfig, ...(styleConfig || {}) };

        // Lightweight debug info (avoid heavy stringify)
        try {
            console.log("PDF GEN: skills count:", Array.isArray((data as any).skills) ? (data as any).skills.length : 0);
            console.log("PDF GEN: projects count:", Array.isArray((data as any).projects) ? (data as any).projects.length : 0);
        } catch (e) { }

        // 2. Generate LaTeX Content using our Nunjucks Builder
        const latexContent = buildLatex(data, templatesDir, templateName, finalStyle, defaultEscaper);

        // 3. Write LaTeX to file (async to avoid blocking main thread)
        const texFilePath = path.join(buildDir, `output-${jobId}.tex`);
        const pdfPath = path.join(buildDir, `output-${jobId}.pdf`);

        await fs.promises.writeFile(texFilePath, latexContent, "utf-8");

        // 4. Pre-flight: ensure latexmk is available
        if (!(await commandExists('latexmk'))) {
            return { success: false, error: 'latexmk not found. Please install a LaTeX distribution (TeX Live or MiKTeX) that provides latexmk/xelatex.' };
        }

        // 5. Run latexmk using spawn (no shell parsing) to avoid injection
        console.log(`Running latexmk compilation... (Job: ${jobId})`);
        let latexErrorOutput = "";
        try {
            // Use halt-on-error in dev to fail fast, but avoid -f to prevent masking fatal errors
            const haltOnError = !!process.env.VITE_DEV_SERVER_URL;
            await runLatexmk(buildDir, texFilePath, signal, { haltOnError });
        } catch (execErr: any) {
            if (execErr?.code === 'ENOENT') {
                return { success: false, error: 'latexmk executable not found. Please install LaTeX.' };
            }
            if (execErr?.message === 'latexmk timed out') {
                return { success: false, error: 'Compilation timed out. Your latex code might have caused an infinite loop or took too long to compile.' };
            }
            if (execErr.name === 'AbortError') {
                console.log(`Job ${jobId} was cancelled.`);
                return { success: false, error: "Compilation Cancelled", canceled: true };
            }
            console.warn("latexmk execution error (continuing to PDF existence check):", execErr?.message?.substring?.(0, 200) || execErr);
            latexErrorOutput = execErr?.message || String(execErr);
        }

        // 6. Verify produced PDF exists and is non-empty
        const stats = fs.existsSync(pdfPath) ? fs.statSync(pdfPath) : null;
        if (!stats || stats.size === 0) {
            if (latexErrorOutput) {
                throw new Error("PDF file was not found or is empty after compilation.\n\nLaTeX Error Details:\n" + latexErrorOutput);
            } else {
                throw new Error("PDF file was not found or is empty after compilation.");
            }
        }

        // 7. Clean up auxiliary files produced by latexmk to keep temp dir tidy
        try {
            spawn('latexmk', ['-c', `-output-directory=${buildDir}`, texFilePath], { stdio: 'ignore' });
        } catch (e) { /* non-fatal cleanup error */ }

        return { success: true, pdfPath: `file://${pdfPath}`.replace(/\\/g, "/") };

    } catch (error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
        console.error("PDF Generation Error:", error);
        return { success: false, error: error.message || error.toString() };
    }
});

ipcMain.handle("save-pdf", async (event, pdfUrl: string) => {
    if (!mainWindow) return { success: false, error: "No window" };

    // Extract base URL without query parameters securely
    const cleanUrl = pdfUrl.split("?")[0];
    const sourcePath = fileURLToPath(cleanUrl);

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "Save PDF",
        defaultPath: "resume.pdf",
        filters: [{ name: "PDF Files", extensions: ["pdf"] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    try {
        await fs.promises.copyFile(sourcePath, filePath);
        return { success: true, filePath };
    } catch (error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
        return { success: false, error: error.message };
    }
});
