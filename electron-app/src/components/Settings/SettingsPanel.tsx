import React, { useRef, useEffect } from "react";
import Appearance from "./Appearance";
import LayoutSettings from "./LayoutSettings";
import DetailsSettings from "./DetailsSettings";

interface SettingsPanelProps {
    templateName: string;
    setTemplateName: (t: string) => void;
    styleConfig: any;
    onStyleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: unknown; type: string } }) => void;
    onClose: () => void;
}

export default function SettingsPanel({
    templateName,
    setTemplateName,
    styleConfig,
    onStyleChange,
    onClose
}: SettingsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <>
            {/* Backdrop Blur Overlay */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-[#1c1c1e]/15 backdrop-blur-[4px] z-20 animate-in fade-in duration-200"
            />
            {/* Settings Card Dialog */}
            <div
                ref={panelRef}
                className="absolute top-12 left-4 right-4 z-30 bg-white border border-[#e9eaef] rounded-[24px] p-8 flex flex-col gap-8 shadow-[0_20px_50px_rgba(42,65,182,0.12)] ring-1 ring-[#2a41b6]/5 select-none overflow-y-auto max-h-[80vh] animate-in slide-in-from-top-3 duration-300"
            >
                <Appearance
                    templateName={templateName}
                    setTemplateName={setTemplateName}
                    font={styleConfig.font}
                    fontSize={styleConfig.font_size}
                    sectionColor={styleConfig.section_color}
                    onStyleChange={onStyleChange}
                />

                <LayoutSettings
                    marginTb={styleConfig.margin_tb}
                    marginLr={styleConfig.margin_lr}
                    sectionSpacing={styleConfig.section_spacing}
                    headingContentGap={styleConfig.heading_content_gap ?? 4}
                    entrySpacing={styleConfig.entry_spacing}
                    itemSpacing={styleConfig.item_spacing}
                    onStyleChange={onStyleChange}
                />

                <DetailsSettings
                    bullet={styleConfig.bullet}
                    bulletIndent={styleConfig.bullet_indent}
                    useIcons={styleConfig.use_icons}
                    extraProtectedTerms={styleConfig.extra_protected_terms}
                    onStyleChange={onStyleChange}
                />
            </div>
        </>
    );
}
