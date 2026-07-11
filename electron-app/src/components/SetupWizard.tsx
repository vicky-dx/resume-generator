import { AlertCircle, CheckCircle2, Copy, ExternalLink, RefreshCw, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { type LatexStatus } from "../hooks/useLatex";

interface SetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    status: LatexStatus | null;
    onRecheck: () => Promise<LatexStatus | null>;
}

export default function SetupWizard({ isOpen, onClose, status, onRecheck }: SetupWizardProps) {
    const [localStatus, setLocalStatus] = useState<LatexStatus | null>(status);
    const [isChecking, setIsChecking] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    useEffect(() => {
        setLocalStatus(status);
    }, [status]);

    if (!isOpen) return null;

    const handleRecheck = async () => {
        setIsChecking(true);
        try {
            const newStatus = await onRecheck();
            setLocalStatus(newStatus);
        } catch (e) {
            console.error("Failed to re-check dependencies:", e);
        } finally {
            setIsChecking(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const isAllReady = localStatus?.latexmk.found && localStatus?.xelatex.found;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-2xl bg-white rounded-[16px] shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#c7cad5]/50 bg-[#f8f9fa]">
                    <div>
                        <h2 className="text-lg font-bold text-[#1c1c1e] font-display">LaTeX Environment Setup</h2>
                        <p className="text-xs text-[#555a6a]">Verify and configure dependencies for PDF compilation</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-[8px] text-[#a5a8b5] hover:text-[#1c1c1e] hover:bg-[#c7cad5]/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    
                    {/* Status Card */}
                    <div className="ring-shadow-border p-5 rounded-[12px] bg-white flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[#1c1c1e] uppercase tracking-wider text-[10px]">
                                Dependency Status
                            </h3>
                            <button
                                onClick={handleRecheck}
                                disabled={isChecking}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5b76fe] hover:bg-[#2a41b6] disabled:bg-[#5b76fe]/50 text-white text-xs font-bold rounded-[8px] transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                                {isChecking ? "Checking..." : "Re-verify"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* latexmk Status */}
                            <div className={`p-4 rounded-[10px] border flex items-start gap-3 transition-colors ${
                                localStatus?.latexmk.found 
                                    ? "bg-[#00b473]/5 border-[#00b473]/20" 
                                    : "bg-[#ffd6d6]/5 border-[#ffd6d6]/40"
                            }`}>
                                {localStatus?.latexmk.found ? (
                                    <CheckCircle2 className="w-5 h-5 text-[#00b473] shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-[#e53e3e] shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <div className="text-sm font-bold text-[#1c1c1e]">latexmk</div>
                                    <div className="text-xs text-[#555a6a] mt-0.5 leading-relaxed">
                                        {localStatus?.latexmk.found 
                                            ? `Found: ${localStatus.latexmk.version || "Unknown version"}` 
                                            : "Missing - Handles LaTeX document building automation."}
                                    </div>
                                </div>
                            </div>

                            {/* xelatex Status */}
                            <div className={`p-4 rounded-[10px] border flex items-start gap-3 transition-colors ${
                                localStatus?.xelatex.found 
                                    ? "bg-[#00b473]/5 border-[#00b473]/20" 
                                    : "bg-[#ffd6d6]/5 border-[#ffd6d6]/40"
                            }`}>
                                {localStatus?.xelatex.found ? (
                                    <CheckCircle2 className="w-5 h-5 text-[#00b473] shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-[#e53e3e] shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <div className="text-sm font-bold text-[#1c1c1e]">xelatex</div>
                                    <div className="text-xs text-[#555a6a] mt-0.5 leading-relaxed">
                                        {localStatus?.xelatex.found 
                                            ? `Found: ${localStatus.xelatex.version || "Unknown version"}` 
                                            : "Missing - The LaTeX typesetting engine."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isAllReady ? (
                            <div className="flex items-center gap-2 text-xs text-[#00b473] bg-[#00b473]/10 p-3 rounded-[8px] font-medium mt-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                Your LaTeX environment is fully set up. PDF compilation is ready to go!
                            </div>
                        ) : (
                            <div className="flex items-start gap-2 text-xs text-[#b7791f] bg-[#fffaf0] border border-[#fbd38d]/40 p-3 rounded-[8px] font-medium mt-2 leading-relaxed">
                                <AlertCircle className="w-4 h-4 shrink-0 text-[#dd6b20] mt-0.5" />
                                <div>
                                    One or more dependencies are missing. Please follow the setup guide below to install them.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Setup Steps */}
                    {!isAllReady && (
                        <div className="flex flex-col gap-5">
                            <h3 className="text-xs font-bold text-[#1c1c1e] uppercase tracking-wider">
                                How to Install
                            </h3>

                            {/* Option 1: Direct Download */}
                            <div className="flex flex-col gap-2.5">
                                <div className="text-sm font-bold text-[#1c1c1e] flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 text-xs text-[#5b76fe] bg-[#5b76fe]/10 rounded-full font-bold">1</span>
                                    Install MiKTeX (Recommended)
                                </div>
                                <div className="text-xs text-[#555a6a] leading-relaxed pl-7">
                                    MiKTeX is a modern, lightweight LaTeX distribution that installs missing packages automatically on the fly.
                                </div>
                                <div className="pl-7">
                                    <a
                                        href="https://miktex.org/download"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5b76fe] hover:text-[#2a41b6] transition-colors"
                                    >
                                        Go to MiKTeX Download Page
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>

                            {/* Option 2: Package Managers */}
                            <div className="flex flex-col gap-3 pt-2">
                                <div className="text-sm font-bold text-[#1c1c1e] flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 text-xs text-[#5b76fe] bg-[#5b76fe]/10 rounded-full font-bold">2</span>
                                    Alternative: Install via CLI
                                </div>
                                <div className="text-xs text-[#555a6a] leading-relaxed pl-7">
                                    If you use Windows package managers, run one of the following commands in an administrator terminal:
                                </div>

                                <div className="pl-7 flex flex-col gap-3 max-w-full">
                                    {/* Scoop Command */}
                                    <div className="bg-[#f8f9fa] border border-[#c7cad5]/50 rounded-[8px] p-3 flex items-center justify-between gap-4 max-w-full overflow-hidden">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-[#a5a8b5]">Scoop</span>
                                            <div className="font-mono text-xs text-[#1c1c1e] truncate mt-1">
                                                scoop install latexmk miktex
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard("scoop install latexmk miktex", "scoop")}
                                            className="p-2 bg-white border border-[#c7cad5]/50 hover:bg-[#c7cad5]/10 rounded-[6px] text-[#555a6a] hover:text-[#1c1c1e] transition-colors shrink-0"
                                            title="Copy command"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Chocolatey Command */}
                                    <div className="bg-[#f8f9fa] border border-[#c7cad5]/50 rounded-[8px] p-3 flex items-center justify-between gap-4 max-w-full overflow-hidden">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-[#a5a8b5]">Chocolatey</span>
                                            <div className="font-mono text-xs text-[#1c1c1e] truncate mt-1">
                                                choco install miktex latexmk
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard("choco install miktex latexmk", "choco")}
                                            className="p-2 bg-white border border-[#c7cad5]/50 hover:bg-[#c7cad5]/10 rounded-[6px] text-[#555a6a] hover:text-[#1c1c1e] transition-colors shrink-0"
                                            title="Copy command"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    
                                    {copiedText && (
                                        <div className="text-[11px] font-bold text-[#00b473] animate-pulse">
                                            Copied {copiedText} command to clipboard!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Verification Step */}
                            <div className="flex flex-col gap-2.5 pt-2">
                                <div className="text-sm font-bold text-[#1c1c1e] flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 text-xs text-[#5b76fe] bg-[#5b76fe]/10 rounded-full font-bold">3</span>
                                    Verify Installation
                                </div>
                                <div className="text-xs text-[#555a6a] leading-relaxed pl-7">
                                    After the installer finishes, **restart the application** so it can detect the newly added executables in your system's PATH. Then click the **Re-verify** button above.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#c7cad5]/50 bg-[#f8f9fa] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-[#c7cad5] hover:bg-[#c7cad5]/10 text-xs font-bold rounded-[8px] text-[#555a6a] hover:text-[#1c1c1e] transition-colors"
                    >
                        {isAllReady ? "Done" : "Ignore for now"}
                    </button>
                </div>
            </div>
        </div>
    );
}
