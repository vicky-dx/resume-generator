import { useEffect, useState, useCallback } from "react";
import { type UpdateState, type UpdateInfo, type UpdateProgress, type UpdateProvider } from "../types/update";

interface UseUpdaterOptions {
    autoCheck?: boolean;
}

export function useUpdater(provider: UpdateProvider, options: UseUpdaterOptions = {}) {
    const [state, setState] = useState<UpdateState>("idle");
    const [progress, setProgress] = useState<UpdateProgress | null>(null);
    const [info, setInfo] = useState<UpdateInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const check = useCallback(async () => {
        try {
            await provider.check();
        } catch (err) {
            console.error("Manual update check failed:", err);
            setState("error");
            setError((err as Error).message);
        }
    }, [provider]);

    const install = useCallback(async () => {
        try {
            await provider.install();
        } catch (err) {
            console.error("Installation failed:", err);
            setState("error");
            setError((err as Error).message);
        }
    }, [provider]);

    // Handle background downloads
    useEffect(() => {
        if (state === "available") {
            provider.download().catch((err) => {
                console.error("Automatic update download failed:", err);
                setState("error");
                setError(err.message);
            });
        }
    }, [state, provider]);

    // Subscribe to provider status and progress events
    useEffect(() => {
        const unsubscribeStatus = provider.onStatus((statusEvent) => {
            setState(statusEvent.state);
            if (statusEvent.info) setInfo(statusEvent.info);
            if (statusEvent.error) setError(statusEvent.error);
        });

        const unsubscribeProgress = provider.onProgress((progressEvent) => {
            setState("downloading");
            setProgress(progressEvent);
        });

        return () => {
            unsubscribeStatus();
            unsubscribeProgress();
        };
    }, [provider]);

    const initialize = useCallback(() => {
        const lastCheck = localStorage.getItem("last_update_check_time");
        const now = Date.now();
        const SIX_HOURS = 6 * 60 * 60 * 1000;
        const isDev = process.env.NODE_ENV === "development";

        if (isDev || !lastCheck || (now - parseInt(lastCheck)) > SIX_HOURS) {
            provider.check()
                .then(() => {
                    localStorage.setItem("last_update_check_time", now.toString());
                })
                .catch((err) => {
                    console.error("Automatic update check failed:", err);
                });
        }
    }, [provider]);

    // Auto check with 6-hour throttle
    useEffect(() => {
        if (options.autoCheck) {
            initialize();
        }
    }, [options.autoCheck, initialize]);

    return {
        state,
        progress,
        info,
        error,
        check,
        install,
        initialize,
    };
}
