export type UpdateState = 
    | "idle" 
    | "checking" 
    | "available" 
    | "not-available" 
    | "downloading" 
    | "ready-to-install" 
    | "error";

export interface UpdateInfo {
    version: string;
    releaseNotes?: string;
    releaseDate?: string;
}

export interface UpdateProgress {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
}

export interface UpdateProvider {
    check(): Promise<void>;
    download(): Promise<void>;
    install(): Promise<void>;
    onStatus(callback: (status: { state: UpdateState; info?: UpdateInfo; error?: string }) => void): () => void;
    onProgress(callback: (progress: UpdateProgress) => void): () => void;
}
