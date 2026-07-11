import { X, Sparkles } from "lucide-react";

interface ReleaseNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    version: string;
    releaseNotes: string;
}

export default function ReleaseNotesModal({ isOpen, onClose, version, releaseNotes }: ReleaseNotesModalProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                onClick={onClose}
                className="fixed inset-0 bg-[#1c1c1e]/40 backdrop-blur-[5px] z-50 animate-in fade-in duration-200"
            />
            {/* Modal Dialog */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white border border-[#e9eaef] rounded-[24px] p-8 shadow-[0_30px_70px_rgba(42,65,182,0.18)] z-50 select-none animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-[#555a6a]/60 hover:text-[#1c1c1e] p-1.5 hover:bg-[#5b76fe]/5 rounded-lg transition-colors cursor-pointer"
                    title="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="bg-[#5b76fe]/10 p-2.5 rounded-xl text-[#5b76fe] shrink-0">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-[#5b76fe] tracking-widest">
                                Release Notes
                            </div>
                            <h2 className="text-xl font-bold text-[#1c1c1e] tracking-tight">
                                What's New in v{version}
                            </h2>
                        </div>
                    </div>

                    <div className="w-full h-px bg-[#e9eaef]" />

                    {/* Content */}
                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-[#555a6a] font-normal leading-relaxed">
                            Your application was successfully updated. Here are the highlights of what was added in this release:
                        </p>
                        <div className="p-4 bg-[#f0f3ff]/40 border border-[#5b76fe]/10 rounded-2xl text-[12px] text-[#1c1c1e] font-normal font-mono max-h-[220px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                            {releaseNotes}
                        </div>
                    </div>

                    <div className="w-full h-px bg-[#e9eaef]" />

                    {/* Footer */}
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={onClose}
                            className="bg-[#5b76fe] hover:bg-[#2a41b6] text-white px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer shadow-sm hover:shadow transition-all"
                        >
                            Let's Go!
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
