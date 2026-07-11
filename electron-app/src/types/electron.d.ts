interface Window {
    electronAPI: typeof import("../../electron/preload").electronAPI;
    updateAPI: typeof import("../../electron/preload").updateAPI;
}
