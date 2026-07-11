import { type UpdateProvider, type UpdateState, type UpdateInfo, type UpdateProgress } from "../types/update";

export class MockUpdateProvider implements UpdateProvider {
    private statusListeners: Array<(status: { state: UpdateState; info?: UpdateInfo; error?: string }) => void> = [];
    private progressListeners: Array<(progress: UpdateProgress) => void> = [];

    public async check(): Promise<void> {
        this.emitStatus({ state: "checking" });

        const currentMockVersion = localStorage.getItem("mock_current_version") || "1.2.0";

        // Simulate network delay
        setTimeout(() => {
            if (currentMockVersion === "2.0.0") {
                this.emitStatus({ state: "not-available" });
            } else {
                // Mock version found
                this.emitStatus({
                    state: "available",
                    info: {
                        version: "2.0.0",
                        releaseNotes: "• Supercharged PDF compile speed\n• Elegant new Settings presets\n• Auto-updater state machine logs",
                        releaseDate: new Date().toISOString()
                    }
                });
            }
        }, 1500);
    }

    public async download(): Promise<void> {
        this.emitStatus({ state: "downloading" });

        let percent = 0;
        const total = 45000000; // 45MB fake size
        const interval = setInterval(() => {
            percent += 10;
            const transferred = (percent / 100) * total;
            
            this.emitProgress({
                percent,
                bytesPerSecond: 1500000, // 1.5MB/s
                transferred,
                total
            });

            if (percent >= 100) {
                clearInterval(interval);
                this.emitStatus({
                    state: "ready-to-install",
                    info: {
                        version: "2.0.0",
                        releaseNotes: "• Supercharged PDF compile speed\n• Elegant new Settings presets\n• Auto-updater state machine logs"
                    }
                });
            }
        }, 300);
    }

    public async install(): Promise<void> {
        localStorage.setItem("mock_current_version", "2.0.0");
        window.location.reload();
    }

    public onStatus(callback: (status: { state: UpdateState; info?: UpdateInfo; error?: string }) => void): () => void {
        this.statusListeners.push(callback);
        return () => {
            this.statusListeners = this.statusListeners.filter(l => l !== callback);
        };
    }

    public onProgress(callback: (progress: UpdateProgress) => void): () => void {
        this.progressListeners.push(callback);
        return () => {
            this.progressListeners = this.progressListeners.filter(l => l !== callback);
        };
    }

    private emitStatus(status: { state: UpdateState; info?: UpdateInfo; error?: string }) {
        this.statusListeners.forEach(listener => listener(status));
    }

    private emitProgress(progress: UpdateProgress) {
        this.progressListeners.forEach(listener => listener(progress));
    }
}
