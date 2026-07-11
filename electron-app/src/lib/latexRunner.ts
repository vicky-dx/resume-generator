import { spawn, spawnSync } from "child_process";

export async function commandExists(cmd: string): Promise<boolean> {
    try {
        // Prefer a binary probe without shell parsing. Try common flags for version output.
        let res = spawnSync(cmd, ["--version"], { stdio: "ignore" });
        if (res && typeof res.status === "number" && res.status === 0) return true;
        res = spawnSync(cmd, ["-v"], { stdio: "ignore" });
        if (res && typeof res.status === "number" && res.status === 0) return true;
        return false;
    } catch (e) {
        return false;
    }
}

export function runLatexmk(
    buildDir: string,
    texFilePath: string,
    signal?: AbortSignal,
    opts?: { haltOnError?: boolean }
): Promise<void> {
    const args = [
        ...(opts?.haltOnError ? ["-halt-on-error"] : []),
        "-xelatex",
        "-interaction=nonstopmode",
        `-output-directory=${buildDir}`,
        texFilePath,
    ];

    return new Promise<void>((resolve, reject) => {
        const proc = spawn("latexmk", args, { stdio: ["ignore", "pipe", "pipe"] as any });
        let timedOut = false;

        // Kill after timeout to avoid hangs
        const timeoutMs = 30000; // 30s default
        const killTimer = setTimeout(() => {
            timedOut = true;
            try {
                proc.kill();
            } catch (e) {}
        }, timeoutMs);

        if (signal) {
            signal.addEventListener("abort", () => {
                try {
                    proc.kill();
                } catch (e) {}
                const abortErr = new Error("Compilation Cancelled");
                abortErr.name = "AbortError";
                reject(abortErr);
            });
        }

        let output = "";
        proc.stdout.on("data", (chunk) => {
            output += chunk.toString();
        });
        proc.stderr.on("data", (chunk) => {
            output += chunk.toString();
        });
        proc.on("error", (err: any) => {
            clearTimeout(killTimer);
            reject(err);
        });
        proc.on("close", (code) => {
            clearTimeout(killTimer);
            if (timedOut) return reject(new Error("latexmk timed out"));
            if (code === 0) return resolve();
            // Non-zero exit -> treat as error and include output to aid debugging
            return reject(new Error(output || `latexmk exited with code ${code}`));
        });
    });
}
