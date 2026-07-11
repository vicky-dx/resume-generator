import { useState } from "react";
import { defaultJSON } from "../constants/defaultResume";
import { ElectronService } from "../services/ElectronService";

export function useDocument() {
    const [jsonText, setJsonText] = useState(defaultJSON);

    const loadDocument = async () => {
        try {
            const result = await ElectronService.openJson();
            if (result.success && result.data) {
                setJsonText(result.data);
            }
        } catch (e) {
            console.error("Failed to open JSON document:", e);
        }
    };

    const saveDocument = async () => {
        try {
            await ElectronService.saveJson(jsonText);
        } catch (e) {
            console.error("Failed to save JSON document:", e);
        }
    };

    return {
        jsonText,
        setJsonText,
        loadDocument,
        saveDocument,
    };
}
