import pkg from "electron-updater";
import { BrowserWindow, ipcMain } from "electron";
const { autoUpdater } = pkg;

export class UpdateManager {
    private static instance: UpdateManager | null = null;
    private mainWindow: BrowserWindow;

    private constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        this.setupAutoUpdater();
        this.setupIpcHandlers();
    }

    public static getInstance(mainWindow: BrowserWindow): UpdateManager {
        if (!UpdateManager.instance) {
            UpdateManager.instance = new UpdateManager(mainWindow);
        } else {
            // Update the main window reference if the window was reloaded/recreated
            UpdateManager.instance.mainWindow = mainWindow;
        }
        return UpdateManager.instance;
    }

    private setupAutoUpdater() {
        // Configure auto-download to be true for silent background downloads
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        // AutoUpdater events to send to React renderer
        autoUpdater.on("checking-for-update", () => {
            this.sendToRenderer("update:status", { state: "checking" });
        });

        autoUpdater.on("update-available", (info) => {
            this.sendToRenderer("update:status", { 
                state: "available", 
                info: {
                    version: info.version,
                    releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : undefined,
                    releaseDate: info.releaseDate
                } 
            });
        });

        autoUpdater.on("update-not-available", () => {
            this.sendToRenderer("update:status", { state: "not-available" });
        });

        autoUpdater.on("download-progress", (progressObj) => {
            this.sendToRenderer("update:progress", {
                percent: Math.round(progressObj.percent),
                bytesPerSecond: progressObj.bytesPerSecond,
                transferred: progressObj.transferred,
                total: progressObj.total
            });
        });

        autoUpdater.on("update-downloaded", (info) => {
            this.sendToRenderer("update:status", { 
                state: "ready-to-install", 
                info: {
                    version: info.version,
                    releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : undefined,
                    releaseDate: info.releaseDate
                } 
            });
        });

        autoUpdater.on("error", (err) => {
            this.sendToRenderer("update:status", { 
                state: "error", 
                error: err.message || "An unknown auto-updater error occurred" 
            });
        });
    }

    private setupIpcHandlers() {
        // Handle requests from Renderer UpdateService
        ipcMain.handle("updater:check", async () => {
            try {
                return await autoUpdater.checkForUpdates();
            } catch (err) {
                console.error("Failed to check for updates:", err);
                throw err;
            }
        });

        ipcMain.handle("updater:download", async () => {
            try {
                return await autoUpdater.downloadUpdate();
            } catch (err) {
                console.error("Failed to download update:", err);
                throw err;
            }
        });

        ipcMain.handle("updater:install", () => {
            autoUpdater.quitAndInstall();
        });
    }

    private sendToRenderer(channel: string, data: any) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
        }
    }
}
