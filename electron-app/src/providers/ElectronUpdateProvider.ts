import { type UpdateProvider, type UpdateState, type UpdateInfo, type UpdateProgress } from "../types/update";

export class ElectronUpdateProvider implements UpdateProvider {
    private getApi() {
        if (!window.updateAPI) {
            throw new Error("updateAPI is unavailable. Ensure preload script is loaded.");
        }
        return window.updateAPI;
    }

    public async check(): Promise<void> {
        await this.getApi().check();
    }

    public async download(): Promise<void> {
        await this.getApi().download();
    }

    public async install(): Promise<void> {
        await this.getApi().install();
    }

    public onStatus(callback: (status: { state: UpdateState; info?: UpdateInfo; error?: string }) => void): () => void {
        return this.getApi().onStatus(callback);
    }

    public onProgress(callback: (progress: UpdateProgress) => void): () => void {
        return this.getApi().onProgress(callback);
    }
}
