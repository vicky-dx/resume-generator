interface CompilationErrorProps {
    error: string;
}

export default function CompilationError({ error }: CompilationErrorProps) {
    return (
        <div className="absolute bottom-0 left-0 w-full bg-[#fbd4d4] text-[#600000] p-4 text-xs border-t border-[#e3c5c5] z-10 max-h-[40vh] overflow-y-auto select-text">
            <p className="font-bold flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Compilation Error
            </p>
            <pre className="whitespace-pre-wrap font-mono mt-2 opacity-80">{error}</pre>
        </div>
    );
}
