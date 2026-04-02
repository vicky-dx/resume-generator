import { contextBridge, ipcRenderer } from "electron";

export const electronAPI = {
    generatePdf: (data: unknown, templateName: string = "classic.tex", styleConfig?: unknown) =>
        ipcRenderer.invoke("generate-pdf", data, templateName, styleConfig),
    openJson: () => ipcRenderer.invoke("open-json"),
    saveJson: (content: string, defaultPath?: string) => ipcRenderer.invoke("save-json", content, defaultPath),
    savePdf: (pdfUrl: string) => ipcRenderer.invoke("save-pdf", pdfUrl),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
