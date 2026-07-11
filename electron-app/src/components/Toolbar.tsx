import { Code2, FolderOpen, ListTree, Loader2, Play, Save, Settings2, Terminal } from "lucide-react";

interface ToolbarProps {
    viewMode: "form" | "json";
    setViewMode: (mode: "form" | "json") => void;
    isCompiling: boolean;
    hasLatexIssues: boolean;
    onOpen: () => void;
    onSave: () => void;
    onCompile: () => void;
    onToggleSettings: () => void;
    onOpenSetup: () => void;
}

export default function Toolbar({
    viewMode,
    setViewMode,
    isCompiling,
    hasLatexIssues,
    onOpen,
    onSave,
    onCompile,
    onToggleSettings,
    onOpenSetup
}: ToolbarProps) {
    return (
        <div className="h-10 bg-white border-b border-[#e9eaef] flex items-center justify-between px-4 select-none shrink-0 z-10">
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => setViewMode("form")}
                    className={`flex items-center gap-1.5 px-[12px] py-[7px] text-[11px] font-semibold rounded-[8px] transition-colors cursor-pointer ${
                        viewMode === "form"
                            ? "bg-[#5b76fe]/10 text-[#5b76fe]"
                            : "text-[#555a6a] hover:bg-[#e9eaef]/50 hover:text-[#1c1c1e]"
                    }`}
                >
                    <ListTree className="w-3.5 h-3.5" /> FORM
                </button>
                <button
                    onClick={() => setViewMode("json")}
                    className={`flex items-center gap-1.5 px-[12px] py-[7px] text-[11px] font-semibold rounded-[8px] transition-colors cursor-pointer ${
                        viewMode === "json"
                            ? "bg-[#5b76fe]/10 text-[#5b76fe]"
                            : "text-[#555a6a] hover:bg-[#e9eaef]/50 hover:text-[#1c1c1e]"
                    }`}
                >
                    <Code2 className="w-3.5 h-3.5" /> JSON
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onOpen}
                    className="flex items-center gap-1.5 bg-transparent border border-[#c7cad5] hover:bg-[#c7cad5]/50 rounded-[8px] text-[11px] text-[#1c1c1e] px-[12px] py-[7px] transition-colors cursor-pointer"
                >
                    <FolderOpen className="w-3 h-3" /> OPEN
                </button>
                <button
                    onClick={onSave}
                    className="flex items-center gap-1.5 bg-transparent border border-[#c7cad5] hover:bg-[#c7cad5]/50 rounded-[8px] text-[11px] text-[#1c1c1e] px-[12px] py-[7px] transition-colors cursor-pointer"
                >
                    <Save className="w-3 h-3" /> SAVE
                </button>
                <div className="w-px h-4 bg-[#e9eaef] mx-1"></div>

                <button
                    onClick={onOpenSetup}
                    className={`flex items-center gap-1.5 border rounded-[8px] text-[11px] font-semibold px-[12px] py-[7px] transition-colors cursor-pointer ${
                        hasLatexIssues
                            ? "border-[#ffd6d6] bg-[#ffd6d6]/20 text-[#dd6b20] hover:bg-[#ffd6d6]/40 animate-pulse"
                            : "border-[#c7cad5] bg-transparent text-[#555a6a] hover:bg-[#c7cad5]/50 hover:text-[#1c1c1e]"
                    }`}
                >
                    <Terminal className="w-3 h-3" />
                    LATEX SETUP
                </button>

                <button
                    onClick={onToggleSettings}
                    className="flex items-center gap-2 border border-[#c7cad5] bg-[#e9eaef]/30 hover:bg-[#e9eaef] rounded-[8px] text-[11px] font-semibold text-[#1c1c1e] px-[12px] py-[7px] transition-colors cursor-pointer"
                >
                    <Settings2 className="w-3 h-3" />
                    SETTINGS
                </button>
                <button
                    onClick={onCompile}
                    disabled={isCompiling}
                    className="flex items-center gap-2 bg-[#5b76fe] hover:bg-[#2a41b6] disabled:bg-[#e9eaef] disabled:text-[#a5a8b5] rounded-[8px] text-[11px] font-semibold text-[#ffffff] px-[12px] py-[7px] transition-colors cursor-pointer ring-shadow-border"
                >
                    {isCompiling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {isCompiling ? "COMPILING" : "COMPILE"}
                </button>
            </div>
        </div>
    );
}
