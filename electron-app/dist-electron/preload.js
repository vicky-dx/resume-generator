import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
var electronAPI = {
	generatePdf: (data, templateName = "classic.tex", styleConfig) => ipcRenderer.invoke("generate-pdf", data, templateName, styleConfig),
	openJson: () => ipcRenderer.invoke("open-json"),
	saveJson: (content, defaultPath) => ipcRenderer.invoke("save-json", content, defaultPath),
	savePdf: (pdfUrl) => ipcRenderer.invoke("save-pdf", pdfUrl)
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//#endregion
export { electronAPI };
