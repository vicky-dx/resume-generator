import { useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { type UpdateState, type UpdateInfo, type UpdateProgress } from "../types/update";

interface UpdateBannerProps {
    state: UpdateState;
    progress: UpdateProgress | null;
    info: UpdateInfo | null;
    error?: string | null;
    onInstall: () => void;
}

export default function UpdateBanner({ state, progress, info, error, onInstall }: UpdateBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;
    if (state === "idle" || state === "not-available" || state === "checking" || state === "available") {
        return null;
    }

    // Helper to format bytes to MB
    const formatMB = (bytes: number) => {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
        <div className="bg-[#f0f3ff] border-b border-[#5b76fe]/20 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between text-xs text-[#2a41b6] font-medium leading-normal animate-in slide-in-from-top-1 z-20 shrink-0 select-none">
            <div className="flex items-start gap-3 flex-1">
                <div className="bg-[#5b76fe]/10 p-2 rounded-lg text-[#5b76fe] shrink-0 mt-0.5">
                    {state === "downloading" ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4 animate-bounce" />
                    )}
                </div>

                <div className="flex-1">
                    {state === "downloading" && progress && (
                        <div className="flex flex-col gap-1.5 w-full max-w-md">
                            <div className="flex justify-between font-bold text-[#1c1c1e]">
                                <span>Downloading New Version {info?.version ? `(${info.version})` : ""}...</span>
                                <span>{progress.percent}%</span>
                            </div>
                            {/* Progress bar container */}
                            <div className="w-full h-1.5 bg-[#5b76fe]/15 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#5b76fe] rounded-full transition-all duration-300" 
                                    style={{ width: `${progress.percent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-[#555a6a] font-normal">
                                <span>Speed: {(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s</span>
                                <span>{formatMB(progress.transferred)} / {formatMB(progress.total)}</span>
                            </div>
                        </div>
                    )}

                    {state === "ready-to-install" && (
                        <div className="flex flex-col gap-1 max-w-xl">
                            <span className="font-bold text-[#1c1c1e] text-[13px] flex items-center gap-1.5">
                                🚀 Version {info?.version} is downloaded and ready to install!
                            </span>
                            {info?.releaseNotes && (
                                <div className="mt-1.5 p-2 bg-white/60 border border-[#5b76fe]/10 rounded-lg text-[11px] text-[#555a6a] font-normal font-mono max-h-[80px] overflow-y-auto whitespace-pre-wrap">
                                    {info.releaseNotes}
                                </div>
                            )}
                        </div>
                    )}

                    {state === "error" && (
                        <span className="text-red-500 font-bold text-[12px]">
                            ⚠️ Auto-update error: {error || "Failed to download update packages."}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 mt-3 md:mt-0 shrink-0">
                {state === "ready-to-install" && (
                    <button
                        onClick={() => {
                            if (info) {
                                localStorage.setItem("pending_release_notes", info.releaseNotes || "");
                                localStorage.setItem("pending_version", info.version || "");
                            }
                            onInstall();
                        }}
                        className="bg-[#5b76fe] hover:bg-[#2a41b6] text-white px-4 py-2 rounded-lg font-semibold cursor-pointer shadow-sm hover:shadow transition-all"
                    >
                        Restart App
                    </button>
                )}

                <button
                    onClick={() => setDismissed(true)}
                    className="text-[#555a6a]/60 hover:text-[#1c1c1e] p-1.5 hover:bg-[#5b76fe]/5 rounded-lg transition-colors cursor-pointer"
                    title="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
