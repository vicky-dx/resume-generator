import { exec } from "child_process";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import util from "util";

import { buildLatex, defaultStyleConfig } from "../src/lib/builder";
import { defaultEscaper } from "../src/lib/escaper";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = util.promisify(exec);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // Fixes Vite preload bundle iterable error
            webSecurity: false, // Useful for loading local PDF files in the viewer
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
        const rawData = fs.readFileSync(filePaths[0], "utf-8");
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
        fs.writeFileSync(filePath, content, "utf-8");
        return { success: true, filePath };
    } catch (error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("generate-pdf", async (event, data: unknown, templateName: string = "classic.tex", styleConfig?: unknown) => {
    try {
        // 1. Setup Build Directory
        const buildDir = path.join(app.getPath("temp"), "resume-builder");
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir, { recursive: true });
        }

        // Optional: We can mock templates location here for now
        // Expecting templates to be in `../templates` relative to app root
        // For dev we point to the original repository's templates
        const templatesDir = path.join(app.getAppPath(), "../templates");

        const finalStyle = { ...defaultStyleConfig, ...(styleConfig || {}) };

        // 2. Generate LaTeX Content using our Nunjucks Builder
        const latexContent = buildLatex(data, templatesDir, templateName, finalStyle, defaultEscaper);

        // 3. Write LaTeX to file
        const texFilePath = path.join(buildDir, "output.tex");
        fs.writeFileSync(texFilePath, latexContent, "utf-8");

        // 4. Compile with xelatex (2 passes needed for layout/references)
        const compileCmd = `xelatex -interaction=nonstopmode -output-directory="${buildDir}" "${texFilePath}"`;

        console.log("First LaTeX compilation pass...");
        await execAsync(compileCmd);

        console.log("Second LaTeX compilation pass...");
        await execAsync(compileCmd);

        // 5. Return the path to the generated PDF
        const pdfPath = path.join(buildDir, "output.pdf");

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
        fs.copyFileSync(sourcePath, filePath);
        return { success: true, filePath };
    } catch (error: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
        return { success: false, error: error.message };
    }
});
