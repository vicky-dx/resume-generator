import React from "react";

interface DetailsSettingsProps {
    bullet: string;
    bulletIndent: number;
    useIcons: boolean;
    extraProtectedTerms: string;
    onStyleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: unknown; type: string } }) => void;
}

export default function DetailsSettings({
    bullet,
    bulletIndent,
    useIcons,
    extraProtectedTerms,
    onStyleChange
}: DetailsSettingsProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="text-[10px] uppercase font-bold text-[#555a6a] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffe6cd]"></span>
                Detailed Options
            </div>
            <div className="flex flex-wrap items-center gap-5 bg-[#ffe6cd]/30 ring-shadow-border p-4 rounded-[16px]">
                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Bullet Style:
                    <select
                        name="bullet"
                        value={bullet}
                        onChange={onStyleChange}
                        className="bg-white border border-[#e9eaef] focus:border-[#5b76fe] focus:ring-1 focus:ring-[#5b76fe] outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs cursor-pointer min-w-[100px] font-mono"
                    >
                        <option value="$\bullet$">• bullet</option>
                        <option value="$\circ$">○ circ</option>
                        <option value="-">- dash</option>
                        <option value="$\ast$">∗ ast</option>
                        <option value="$\cdot$">· cdot</option>
                    </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Bullet Indentation:
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            name="bullet_indent"
                            value={bulletIndent}
                            onChange={onStyleChange}
                            className="w-16 accent-[#5b76fe]"
                        />
                        <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            name="bullet_indent"
                            value={bulletIndent}
                            onChange={onStyleChange}
                            className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </label>
                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium cursor-pointer hover:text-[#1c1c1e] transition-colors">
                    <input
                        type="checkbox"
                        name="use_icons"
                        checked={useIcons}
                        onChange={onStyleChange}
                        className="w-4 h-4 rounded-[4px] bg-white ring-shadow-border border border-[#e9eaef] text-[#5b76fe] focus:ring-[#5b76fe] focus:ring-1 cursor-pointer"
                    />
                    Show Header Icons
                </label>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium flex-1 min-w-[200px]">
                    Protect Capitalized Terms:
                    <input
                        type="text"
                        name="extra_protected_terms"
                        placeholder="e.g. React, AWS"
                        value={extraProtectedTerms}
                        onChange={onStyleChange}
                        className="bg-white border border-[#e9eaef] focus:border-[#5b76fe] focus:ring-1 focus:ring-[#5b76fe] outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs w-full placeholder:text-[#a5a8b5]"
                    />
                </label>
            </div>
        </div>
    );
}
