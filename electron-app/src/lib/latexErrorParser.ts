export function parseLatexError(rawLog: string): string {
    if (!rawLog) return "Unknown Error";
    const lines = rawLog.split("\n");
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("! Undefined control sequence.")) {
            return `Undefined control sequence near line ${lines[i + 1]?.trim() || "unknown"}`;
        }
        if (lines[i].startsWith("! ")) {
            return lines[i].substring(2);
        }
    }
    return "Compilation failed. (Check raw logs for details)";
}
