import React from "react";

interface LayoutSettingsProps {
    marginTb: number;
    marginLr: number;
    sectionSpacing: number;
    headingContentGap: number;
    entrySpacing: number;
    itemSpacing: number;
    onStyleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: unknown; type: string } }) => void;
}

export default function LayoutSettings({
    marginTb,
    marginLr,
    sectionSpacing,
    headingContentGap,
    entrySpacing,
    itemSpacing,
    onStyleChange
}: LayoutSettingsProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="text-[10px] uppercase font-bold text-[#555a6a] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b76fe]"></span>
                Layout & Spacings
            </div>
            <div className="flex flex-wrap items-center gap-5 bg-[#c3faf5]/30 ring-shadow-border p-4 rounded-[16px]">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#555a6a] font-semibold">Margins:</span>
                    <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                        Top/Bottom:
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0.1"
                                max="1.5"
                                step="0.1"
                                name="margin_tb"
                                value={marginTb}
                                onChange={onStyleChange}
                                className="w-20 accent-[#5b76fe]"
                            />
                            <input
                                type="number"
                                min="0.1"
                                max="1.5"
                                step="0.1"
                                name="margin_tb"
                                value={marginTb}
                                onChange={onStyleChange}
                                className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                        Left/Right:
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0.1"
                                max="1.5"
                                step="0.1"
                                name="margin_lr"
                                value={marginLr}
                                onChange={onStyleChange}
                                className="w-20 accent-[#5b76fe]"
                            />
                            <input
                                type="number"
                                min="0.1"
                                max="1.5"
                                step="0.1"
                                name="margin_lr"
                                value={marginLr}
                                onChange={onStyleChange}
                                className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </label>
                </div>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#555a6a] font-semibold">Spacing / Gaps:</span>
                    <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                        Between Sections:
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="25"
                                step="1"
                                name="section_spacing"
                                value={sectionSpacing}
                                onChange={onStyleChange}
                                className="w-20 accent-[#5b76fe]"
                            />
                            <input
                                type="number"
                                min="0"
                                max="25"
                                step="1"
                                name="section_spacing"
                                value={sectionSpacing}
                                onChange={onStyleChange}
                                className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                        Below Heading Lines:
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="15"
                                step="1"
                                name="heading_content_gap"
                                value={headingContentGap}
                                onChange={onStyleChange}
                                className="w-16 accent-[#5b76fe]"
                            />
                            <input
                                type="number"
                                min="1"
                                max="15"
                                step="1"
                                name="heading_content_gap"
                                value={headingContentGap}
                                onChange={onStyleChange}
                                className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                        Between Jobs:
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="20"
                                step="1"
                                name="entry_spacing"
                                value={entrySpacing}
                                onChange={onStyleChange}
                                className="w-20 accent-[#5b76fe]"
                            />
                            <input
                                type="number"
                                min="0"
                                max="20"
                                step="1"
                                name="entry_spacing"
                                value={entrySpacing}
                                onChange={onStyleChange}
                                className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </label>
                </div>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Line Spacing (bullets):
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            name="item_spacing"
                            value={itemSpacing}
                            onChange={onStyleChange}
                            className="w-20 accent-[#5b76fe]"
                        />
                        <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            name="item_spacing"
                            value={itemSpacing}
                            onChange={onStyleChange}
                            className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </label>
            </div>
        </div>
    );
}
