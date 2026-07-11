import React from "react";

interface AppearanceProps {
    templateName: string;
    setTemplateName: (t: string) => void;
    font: string;
    fontSize: number;
    sectionColor: number[];
    onStyleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: unknown; type: string } }) => void;
}

// Helper to convert RGB array to Hex
const rgbToHex = (rgb: number[]) => {
    return "#" + rgb.map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
};

// Helper to convert Hex to RGB array
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [96, 36, 191]; // Default purple
};

export default function Appearance({
    templateName,
    setTemplateName,
    font,
    fontSize,
    sectionColor,
    onStyleChange
}: AppearanceProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="text-[10px] uppercase font-bold text-[#555a6a] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fde0f0]"></span>
                Style & Appearance
            </div>
            <div className="flex flex-wrap items-center gap-5 bg-[#fde0f0]/30 ring-shadow-border p-4 rounded-[16px]">
                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Template:
                    <select
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="bg-white border border-[#e9eaef] focus:border-[#5b76fe] focus:ring-1 focus:ring-[#5b76fe] outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs cursor-pointer min-w-[120px]"
                    >
                        <option value="classic.tex">classic.tex</option>
                        <option value="experiment.tex">experiment.tex</option>
                        <option value="german.tex">german.tex</option>
                    </select>
                </label>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Font:
                    <select
                        name="font"
                        value={font}
                        onChange={onStyleChange}
                        className="bg-white border border-[#e9eaef] focus:border-[#5b76fe] focus:ring-1 focus:ring-[#5b76fe] outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs cursor-pointer min-w-[120px]"
                    >
                        <option value="Calibri">Calibri</option>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Garamond">Garamond</option>
                        <option value="Palatino Linotype">Palatino</option>
                    </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Size:
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min="8"
                            max="16"
                            step="0.5"
                            name="font_size"
                            value={fontSize}
                            onChange={onStyleChange}
                            className="w-24 accent-[#5b76fe]"
                        />
                        <input
                            type="number"
                            min="8"
                            max="16"
                            step="0.5"
                            name="font_size"
                            value={fontSize}
                            onChange={onStyleChange}
                            className="w-12 bg-white border border-[#c7cad5]/80 text-[#5b76fe] focus:border-[#5b76fe] focus:ring-[1px] focus:ring-[#5b76fe] text-center font-mono text-[10px] rounded-[4px] py-0.5 outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </label>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Colour:
                    <input
                        type="color"
                        name="section_color"
                        value={rgbToHex(sectionColor)}
                        onChange={(e) => onStyleChange({
                            target: {
                                name: 'section_color',
                                value: hexToRgb(e.target.value),
                                type: 'color'
                            }
                        })}
                        className="w-8 h-8 rounded-[8px] cursor-pointer border-0 p-0 bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[8px]"
                    />
                </label>
            </div>
        </div>
    );
}
