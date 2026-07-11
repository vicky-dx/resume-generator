import { useState, useEffect, useCallback } from "react";
import { ElectronService } from "../services/ElectronService";

export interface LatexDependency {
    found: boolean;
    path: string | null;
    version: string | null;
}

export interface LatexStatus {
    latexmk: LatexDependency;
    xelatex: LatexDependency;
}

export function useLatex() {
    const [latexStatus, setLatexStatus] = useState<LatexStatus | null>(null);
    const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

    const checkDependencies = useCallback(async () => {
        try {
            const status = await ElectronService.checkDependencies();
            setLatexStatus(status);
            return status;
        } catch (e) {
            console.error("Failed to check LaTeX environment dependencies:", e);
            return null;
        }
    }, []);

    useEffect(() => {
        checkDependencies();
    }, [checkDependencies]);

    const hasIssues = latexStatus
        ? !latexStatus.latexmk.found || !latexStatus.xelatex.found
        : false;

    return {
        latexStatus,
        checkDependencies,
        hasIssues,
        isSetupWizardOpen,
        setIsSetupWizardOpen,
    };
}
