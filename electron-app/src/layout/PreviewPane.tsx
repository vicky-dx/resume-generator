import { FileDown, Loader2 } from "lucide-react";

interface PreviewPaneProps {
    pdfUrl: string | null;
    lastPdfUrl: string | null;
    isCompiling: boolean;
    onDownload: () => void;
}

export function PreviewPane({
    pdfUrl,
    lastPdfUrl,
    isCompiling,
    onDownload
}: PreviewPaneProps) {
    return (
        <div className="w-1/2 flex flex-col bg-[#c7cad5] relative h-full">
            <div className="h-10 bg-white border-b border-[#e9eaef] flex items-center px-4 justify-between select-none shrink-0 z-10">
                <div className="text-xs font-semibold text-[#555a6a] tracking-wider">PDF PREVIEW</div>
                <button
                    onClick={onDownload}
                    disabled={!pdfUrl}
                    className={`flex items-center gap-1.5 transition-colors ${
                        pdfUrl ? 'text-[#555a6a] hover:text-[#1c1c1e] cursor-pointer' : 'text-[#a5a8b5] cursor-not-allowed'
                    }`}
                    title="Download PDF"
                >
                    <FileDown className="w-3 h-3" />
                    <span className="text-xs uppercase">Download</span>
                </button>
            </div>

            <div className="flex-1 bg-[#e9eaef] flex justify-center w-full h-full relative overflow-hidden">
                {pdfUrl || lastPdfUrl ? (
                    <iframe
                        src={pdfUrl || lastPdfUrl || undefined}
                        className="w-full h-full border-none m-0 p-0"
                        title="PDF Preview"
                    />
                ) : (
                    <div className="m-auto flex flex-col items-center justify-center text-[#555a6a] gap-3 opacity-50 relative z-0">
                        <FileDown className="w-12 h-12" />
                        <div className="text-sm">No PDF Generated</div>
                        <div className="text-xs text-[#555a6a]">Edit form or JSON to generate</div>
                    </div>
                )}

                {isCompiling && (
                    <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-sm z-10 transition-all duration-300">
                        <div className="bg-white border border-[#e9eaef] px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-[#5b76fe]" />
                            <span className="text-sm font-bold tracking-widest text-[#555a6a] uppercase animate-pulse">
                                Compiling PDF...
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
