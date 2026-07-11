const getElectronAPI = () => {
    if (!window.electronAPI) {
        throw new Error("Electron API is unavailable. Launch the app through the Electron desktop app or the Electron dev script.");
    }
    return window.electronAPI;
};

export const ElectronService = {
    generatePdf: async (data: unknown, templateName: string, styleConfig: unknown) => {
        const api = getElectronAPI();
        return await api.generatePdf(data, templateName, styleConfig);
    },
    savePdf: async (pdfUrl: string) => {
        const api = getElectronAPI();
        return await api.savePdf(pdfUrl);
    },
    openJson: async () => {
        const api = getElectronAPI();
        return await api.openJson();
    },
    saveJson: async (content: string) => {
        const api = getElectronAPI();
        return await api.saveJson(content);
    },
    checkDependencies: async () => {
        const api = getElectronAPI();
        return await api.checkDependencies();
    }
};
