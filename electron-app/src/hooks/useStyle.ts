import { useState, useEffect } from "react";
import { defaultStyleConfig, type StyleConfig } from "../constants/defaultStyle";

export function useStyle() {
    const [templateName, setTemplateName] = useState(() => {
        const saved = localStorage.getItem("resume_template_name");
        return saved || "classic.tex";
    });

    const [styleConfig, setStyleConfig] = useState<StyleConfig>(() => {
        const saved = localStorage.getItem("resume_style_config");
        if (saved) {
            try {
                return { ...defaultStyleConfig, ...JSON.parse(saved) };
            } catch (e) {
                // Fallback on JSON parse error
            }
        }
        return defaultStyleConfig;
    });

    useEffect(() => {
        localStorage.setItem("resume_template_name", templateName);
    }, [templateName]);

    useEffect(() => {
        localStorage.setItem("resume_style_config", JSON.stringify(styleConfig));
    }, [styleConfig]);

    const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: unknown; type: string } }) => {
        const target = e.target;
        const name = target.name;
        const type = target.type;

        let value: string | boolean | number = target.value as string | boolean | number;
        if (type === "checkbox") value = (target as HTMLInputElement).checked;
        if (type === "number" || type === "range") value = parseFloat(value as string);

        setStyleConfig((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const updateStyleField = (name: string, value: unknown) => {
        setStyleConfig((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    return {
        templateName,
        setTemplateName,
        styleConfig,
        setStyleConfig,
        handleStyleChange,
        updateStyleField,
    };
}
