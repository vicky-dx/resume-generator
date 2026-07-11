import { spawnSync } from "child_process";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { UpdateManager } from "./UpdateManager";
import { compileResume } from "../src/services/ResumeCompiler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    } else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }

    // Initialize Auto-Updater Manager singleton
    UpdateManager.getInstance(mainWindow);
}

app.disableHardwareAcceleration();
// Suppress Chromium/GPU verbose error logging in the terminal
app.commandLine.appendSwitch("log-level", "3");

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
        properties: ["openFile"],
    });
    if (canceled || filePaths.length === 0) return { success: false, canceled: true };
    try {
        const rawData = await fs.promises.readFile(filePaths[0], "utf-8");
        return { success: true, data: rawData, filePath: filePaths[0] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("save-json", async (event, content: string, defaultPath?: string) => {
    if (!mainWindow) return { success: false, error: "No window" };
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "Save Resume JSON",
        defaultPath: defaultPath || "resume.json",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    try {
        await fs.promises.writeFile(filePath, content, "utf-8");
        return { success: true, filePath };
    } catch (error: any) {
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

        // Templates directory: prefer packaged resources, fallback to dev path
        const packagedTemplates = path.join(process.resourcesPath || "", "templates");
        const devTemplates = path.join(app.getAppPath(), "../templates");
        const templatesDir = fs.existsSync(packagedTemplates) ? packagedTemplates : devTemplates;

        const result = await compileResume(data, {
            templateName,
            styleConfig: styleConfig as any,
            templatesDir,
            signal,
            haltOnError: !!process.env.VITE_DEV_SERVER_URL,
        });

        if (result.success) {
            return {
                success: true,
                pdfPath: `file://${result.pdfPath}`.replace(/\\/g, "/"),
            };
        } else {
            return {
                success: false,
                kind: result.kind,
                error: result.error,
                parsedError: result.kind === "compilation" ? result.parsedError : undefined,
                validationErrors: result.kind === "validation" ? result.validationErrors : undefined,
            };
        }
    } catch (error: any) {
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
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    try {
        await fs.promises.copyFile(sourcePath, filePath);
        return { success: true, filePath };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("check-dependencies", async () => {
    const checkCommand = (cmd: string) => {
        try {
            const res = spawnSync(cmd, ["--version"], { encoding: "utf-8" });
            if (res.status === 0) {
                const version = res.stdout.split("\n")[0].trim();
                return { found: true, version };
            }
            const resV = spawnSync(cmd, ["-v"], { encoding: "utf-8" });
            if (resV.status === 0) {
                const version = resV.stdout.split("\n")[0].trim();
                return { found: true, version };
            }
            return { found: false };
        } catch (e) {
            return { found: false };
        }
    };

    return {
        latexmk: checkCommand("latexmk"),
        xelatex: checkCommand("xelatex"),
    };
});

ipcMain.handle("get-version", () => {
    return app.getVersion();
});
