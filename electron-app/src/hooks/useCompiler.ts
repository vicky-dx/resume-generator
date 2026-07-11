import { useState, useCallback } from "react";
import { useCompileStatus } from "./useCompileStatus";
import { ElectronService } from "../services/ElectronService";
import { normalizeResume } from "../services/ResumeNormalizer";
import { parseLatexError } from "../lib/latexErrorParser";

export function useCompiler() {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);
    const { status, setStatus, errorMsg, setErrorMsg, isCompiling } = useCompileStatus();

    const compile = useCallback(async (jsonText: string, templateName: string, styleConfig: any) => {
        setStatus("compiling");
        setErrorMsg(null);

        try {
            const data = normalizeResume(jsonText);

            // Pre-process style terms
            const finalStyleConfig = {
                ...styleConfig,
                heading_content_gap: Math.max(1, styleConfig.heading_content_gap || 1),
                extra_protected_terms: styleConfig.extra_protected_terms
                    ? styleConfig.extra_protected_terms.split(",").map((t: string) => t.trim()).filter(Boolean)
                    : []
            };

            const result = await ElectronService.generatePdf(data, templateName, finalStyleConfig);

            if (result.success) {
                const newUrl = `${result.pdfPath}?t=${Date.now()}#zoom=100&navpanes=0&pagemode=none`;
                setPdfUrl(newUrl);
                setLastPdfUrl(newUrl);
                setStatus("done");
                return { success: true };
            } else if (result.canceled) {
                console.log("Previous compilation canceled smoothly.");
                return { success: false, canceled: true };
            } else {
                const error = result.error || "";
                setErrorMsg(parseLatexError(error));
                setStatus("error");
                return { success: false, error };
            }
        } catch (e: unknown) {
            let message = "";
            if (e instanceof SyntaxError) {
                message = "Invalid JSON: " + e.message;
            } else {
                message = (e as Error).message;
            }
            setErrorMsg(message);
            setStatus("error");
            return { success: false, error: message };
        }
    }, [setStatus, setErrorMsg]);

    const downloadPdf = useCallback(async () => {
        if (!pdfUrl) return;
        try {
            await ElectronService.savePdf(pdfUrl);
        } catch (e) {
            console.error("Failed to download PDF:", e);
        }
    }, [pdfUrl]);

    return {
        pdfUrl,
        lastPdfUrl,
        status,
        errorMsg,
        isCompiling,
        compile,
        downloadPdf,
    };
}
