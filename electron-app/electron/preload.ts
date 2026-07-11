import { contextBridge, ipcRenderer } from "electron";

export const electronAPI = {
    generatePdf: (data: unknown, templateName: string = "classic.tex", styleConfig?: unknown) =>
        ipcRenderer.invoke("generate-pdf", data, templateName, styleConfig),
    openJson: () => ipcRenderer.invoke("open-json"),
    saveJson: (content: string, defaultPath?: string) => ipcRenderer.invoke("save-json", content, defaultPath),
    savePdf: (pdfUrl: string) => ipcRenderer.invoke("save-pdf", pdfUrl),
    checkDependencies: () => ipcRenderer.invoke("check-dependencies"),
    getVersion: () => ipcRenderer.invoke("get-version"),
};

export const updateAPI = {
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    onStatus: (callback: (status: any) => void) => {
        const subscription = (_event: unknown, value: any) => callback(value);
        ipcRenderer.on("update:status", subscription);
        return () => {
            ipcRenderer.removeListener("update:status", subscription);
        };
    },
    onProgress: (callback: (progress: any) => void) => {
        const subscription = (_event: unknown, value: any) => callback(value);
        ipcRenderer.on("update:progress", subscription);
        return () => {
            ipcRenderer.removeListener("update:progress", subscription);
        };
    }
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
contextBridge.exposeInMainWorld("updateAPI", updateAPI);
