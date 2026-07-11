import { performance } from "node:perf_hooks";
import fs from "fs";
import path from "path";
import os from "os";
import { z } from "zod";
import { type CompileOptions, type CompileResult } from "../types/compiler";
import { buildLatex, defaultStyleConfig } from "../lib/builder";
import { defaultEscaper } from "../lib/escaper";
import { ResumeDataSchema } from "../models/resume";
import { normalizeResume } from "./ResumeNormalizer";
import { commandExists, runLatexmk } from "../lib/latexRunner";
import { parseLatexError } from "../lib/latexErrorParser";

export async function compileResume(
    resumeData: unknown,
    options: CompileOptions
): Promise<CompileResult> {
    const startTime = performance.now();
    let tempDir = "";
    let pdfFilePath = "";
    let success = false;
    const jobId = Date.now().toString();

    try {
        // 1. Normalize resume data
        const normalized = normalizeResume(resumeData);

        // 2. Validate using Zod schema
        const parseResult = ResumeDataSchema.safeParse(normalized);
        if (!parseResult.success) {
            const validationErrors = parseResult.error.issues.map((err: z.ZodIssue) => ({
                path: err.path.join("."),
                message: err.message,
            }));
            const formattedErrors = validationErrors
                .map((err: { path: string; message: string }) => `- Path: "${err.path}" -> ${err.message}`)
                .join("\n");

            return {
                success: false,
                kind: "validation",
                error: `Validation failed:\n${formattedErrors}`,
                validationErrors,
                durationMs: performance.now() - startTime,
            };
        }
        const validatedData = parseResult.data;

        // 3. Build LaTeX code from nunjucks template
        const finalStyle = { ...defaultStyleConfig, ...(options.styleConfig || {}) };
        const latexContent = buildLatex(
            validatedData,
            options.templatesDir,
            options.templateName || "classic.tex",
            finalStyle,
            defaultEscaper
        );

        // 4. Create job-specific temporary compilation directory
        tempDir = path.join(os.tmpdir(), `resume-build-${jobId}`);
        await fs.promises.mkdir(tempDir, { recursive: true });

        const texFilePath = path.join(tempDir, `output-${jobId}.tex`);
        pdfFilePath = path.join(tempDir, `output-${jobId}.pdf`);

        await fs.promises.writeFile(texFilePath, latexContent, "utf-8");

        // 5. Pre-flight check: Ensure LaTeX compiler (latexmk) is available
        const latexmkExists = await commandExists("latexmk");
        if (!latexmkExists) {
            return {
                success: false,
                kind: "compilation",
                error: "latexmk executable not found. Please ensure a LaTeX distribution (MacTeX/TeX Live/MiKTeX) is installed.",
                durationMs: performance.now() - startTime,
            };
        }

        // 6. Spawn LaTeX compilation process
        try {
            await runLatexmk(tempDir, texFilePath, options.signal, {
                haltOnError: options.haltOnError,
            });
        } catch (compileErr: any) {
            if (
                compileErr?.name === "AbortError" ||
                compileErr?.message === "Compilation Cancelled"
            ) {
                return {
                    success: false,
                    kind: "cancelled",
                    error: "Compilation Cancelled",
                    durationMs: performance.now() - startTime,
                };
            }

            // Extract logs on error and parse them
            const logFilePath = path.join(tempDir, `output-${jobId}.log`);
            let logContent = "";
            try {
                if (fs.existsSync(logFilePath)) {
                    logContent = await fs.promises.readFile(logFilePath, "utf-8");
                }
            } catch (e) {}

            const parsedError = logContent ? parseLatexError(logContent) : undefined;

            return {
                success: false,
                kind: "compilation",
                error: compileErr.message || "LaTeX compilation failed",
                parsedError,
                rawLog: logContent || compileErr.message,
                durationMs: performance.now() - startTime,
            };
        }

        // 7. Verify compiled PDF file output
        if (!fs.existsSync(pdfFilePath) || fs.statSync(pdfFilePath).size === 0) {
            return {
                success: false,
                kind: "compilation",
                error: "PDF file was not produced or is empty after LaTeX compilation.",
                durationMs: performance.now() - startTime,
            };
        }

        // Parse compilation warnings from log file
        const warnings: string[] = [];
        try {
            const logFilePath = path.join(tempDir, `output-${jobId}.log`);
            if (fs.existsSync(logFilePath)) {
                const logLines = (await fs.promises.readFile(logFilePath, "utf-8")).split("\n");
                logLines.forEach((line) => {
                    if (line.toLowerCase().includes("warning")) {
                        warnings.push(line.trim());
                    }
                });
            }
        } catch (e) {}

        success = true;
        return {
            success: true,
            pdfPath: pdfFilePath,
            warnings: warnings.slice(0, 10),
            durationMs: performance.now() - startTime,
        };
    } catch (generalErr: any) {
        return {
            success: false,
            kind: "compilation",
            error: generalErr.message || String(generalErr),
            durationMs: performance.now() - startTime,
        };
    } finally {
        if (tempDir) {
            const isSuccess = success;
            const pdfFile = pdfFilePath;
            // Clean up auxiliary files asynchronously.
            // On success, we preserve the compiled PDF. On failure, we delete the entire folder.
            fs.readdir(tempDir, (err, files) => {
                if (!err && files) {
                    let unlinkedCount = 0;
                    const totalFiles = files.length;
                    if (totalFiles === 0) {
                        if (!isSuccess) {
                            fs.rm(tempDir, { recursive: true, force: true }, () => {});
                        }
                        return;
                    }
                    files.forEach((f) => {
                        const fp = path.join(tempDir, f);
                        if (isSuccess && pdfFile && fp === pdfFile) {
                            unlinkedCount++;
                            if (unlinkedCount === totalFiles && !isSuccess) {
                                fs.rm(tempDir, { recursive: true, force: true }, () => {});
                            }
                            return;
                        }
                        fs.unlink(fp, () => {
                            unlinkedCount++;
                            if (unlinkedCount === totalFiles && !isSuccess) {
                                fs.rm(tempDir, { recursive: true, force: true }, () => {});
                            }
                        });
                    });
                }
            });
        }
    }
}
