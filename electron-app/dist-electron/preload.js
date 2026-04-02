import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
var n = {
	generatePdf: (e, n = "classic.tex", r) => t.invoke("generate-pdf", e, n, r),
	openJson: () => t.invoke("open-json"),
	saveJson: (e, n) => t.invoke("save-json", e, n),
	savePdf: (e) => t.invoke("save-pdf", e)
};
e.exposeInMainWorld("electronAPI", n);
//#endregion
export { n as electronAPI };
