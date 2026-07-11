interface LatexWarningBannerProps {
    onOpenSetup: () => void;
}

export default function LatexWarningBanner({ onOpenSetup }: LatexWarningBannerProps) {
    return (
        <div className="bg-[#fffaf0] border-b border-[#fbd38d]/40 px-4 py-2.5 flex items-center justify-between text-xs text-[#dd6b20] font-medium leading-normal animate-in slide-in-from-top-1 shrink-0 z-10">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#dd6b20] animate-pulse"></span>
                <span>LaTeX dependencies are missing. Resume compilation will fail.</span>
            </div>
            <button
                onClick={onOpenSetup}
                className="text-[#5b76fe] hover:text-[#2a41b6] font-bold underline transition-colors cursor-pointer"
            >
                Open Setup Guide
            </button>
        </div>
    );
}
