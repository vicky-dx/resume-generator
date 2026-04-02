/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import nunjucks from "nunjucks";
import { LatexEscaper } from "./escaper";

// --- Python String Polyfills for Jinja2 Compatibility in Nunjucks ---
declare global {
    interface String {
        rstrip(chars?: string): string;
        lstrip(chars?: string): string;
        startswith(searchString: string, position?: number): boolean;
        endswith(searchString: string, endPosition?: number): boolean;
        upper(): string;
        lower(): string;
    }
}

if (!String.prototype.rstrip) {
    String.prototype.rstrip = function (chars?: string) {
        if (!chars) return this.trimEnd();
        const escaped = chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`[${escaped}]+$`);
        return this.replace(regex, '');
    };
}
if (!String.prototype.lstrip) {
    String.prototype.lstrip = function (chars?: string) {
        if (!chars) return this.trimStart();
        const escaped = chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^[${escaped}]+`);
        return this.replace(regex, '');
    };
}
if (!String.prototype.startswith) {
    String.prototype.startswith = String.prototype.startsWith;
}
if (!String.prototype.endswith) {
    String.prototype.endswith = String.prototype.endsWith;
}
if (!String.prototype.upper) {
    String.prototype.upper = String.prototype.toUpperCase;
}
if (!String.prototype.lower) {
    String.prototype.lower = String.prototype.toLowerCase;
}

// Polyfill to allow python-style `split('/')[-1]` indexing in Jinja arrays
const originalSplit = String.prototype.split;
// @ts-ignore
String.prototype.split = function (separator: string | RegExp, limit?: number) {
    const res = originalSplit.call(this, separator as any, limit);
    Object.defineProperty(res, '-1', {
        get: function () { return this[this.length - 1]; },
        enumerable: false,
        configurable: true
    });
    return res;
};
// --------------------------------------------------------------------

export interface StyleConfig {
    font: string;
    font_size: number;
    section_color: [number, number, number];
    margin_tb: number;
    margin_lr: number;
    item_spacing: number;
    section_spacing: number;
    entry_spacing: number;
    bullet_indent: number;
    bullet: string;
    use_icons: boolean;
    extra_protected_terms: string[];
}

export const defaultStyleConfig: StyleConfig = {
    font: "Calibri",
    font_size: 11,
    section_color: [96, 36, 191],
    margin_tb: 0.5,
    margin_lr: 0.6,
    item_spacing: 2.0,
    section_spacing: 10,
    entry_spacing: 8,
    bullet_indent: 1.2,
    bullet: "•",
    use_icons: false,
    extra_protected_terms: [],
};

/**
 * Configure Nunjucks Environment with LaTeX-safe delimiters
 * Equivalent to python's JinjaEnvConfigurator
 */
export function buildNunjucksEnv(
    templateDir: string,
    style: StyleConfig,
    escaper: LatexEscaper
): nunjucks.Environment {
    // Use FileSystemLoader since this will run in the Node/Electron main process
    // Add noCache: true so it doesn't aggressively cache template files during dev
    const loader = new nunjucks.FileSystemLoader(templateDir, { noCache: true });

    const env = new nunjucks.Environment(loader, {
        tags: {
            blockStart: "<%",
            blockEnd: "%>",
            variableStart: "<<",
            variableEnd: ">>",
            commentStart: "<#",
            commentEnd: "#>",
        },
        trimBlocks: true,
        lstripBlocks: true,
        autoescape: false, // We control escaping via the escape_latex filter
    });

    // Filters - exactly like Jinja2's `escape_latex`
    env.addFilter("escape_latex", (val) => escaper.recursiveEscape(val));

    // Globals - style config variables
    // (We also inject them into the context directly below for safety)
    env.addGlobal("font", style.font);
    env.addGlobal("font_size", style.font_size);
    env.addGlobal("section_color", style.section_color);
    env.addGlobal("margin_tb", style.margin_tb);
    env.addGlobal("margin_lr", style.margin_lr);
    env.addGlobal("item_spacing", style.item_spacing);
    env.addGlobal("section_spacing", style.section_spacing);
    env.addGlobal("entry_spacing", style.entry_spacing);
    env.addGlobal("bullet_indent", style.bullet_indent);
    env.addGlobal("bullet", style.bullet);
    env.addGlobal("use_icons", style.use_icons);

    return env;
}

/**
 * Helper to recursively add .get() to all objects in the data payload
 * This avoids mutating the global Object.prototype which crashes Electron.
 */
function addPythonGetPolyfill(obj: any): any {
    if (obj !== null && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            obj.forEach(addPythonGetPolyfill);
        } else {
            // It's a plain object
            if (!obj.get) {
                Object.defineProperty(obj, 'get', {
                    value: function (key: string, defaultValue: any = null) {
                        return this[key] !== undefined ? this[key] : defaultValue;
                    },
                    enumerable: false, // Don't show up in Object.keys / for...in
                    writable: true,
                    configurable: true
                });
            }
            // Recursively process nested dictionaries
            for (const key of Object.keys(obj)) {
                addPythonGetPolyfill(obj[key]);
            }
        }
    }
    return obj;
}

/**
 * Main function to generate the final LaTeX string from JSON data.
 * Think of it as the JinjaLatexDocumentBuilder logic.
 */
export function buildLatex(
    data: any,
    templateDir: string,
    templateName: string,
    style: StyleConfig = defaultStyleConfig,
    escaper: LatexEscaper = new LatexEscaper()
): string {
    const env = buildNunjucksEnv(templateDir, style, escaper);

    // 1. First, deeply escape all strings to be LaTeX-safe (replaces python's builder.build logic)
    const escapedData = escaper.recursiveEscape(data);

    // 2. Safely polyfill .get() purely on the localized template data payload
    const compatibleData = addPythonGetPolyfill(escapedData);

    // Merge the style variables precisely into the root context payload.
    // This physically guarantees Nunjucks sees `font_size`, `use_icons` etc without relying on global caching.
    const fullContextPayload = {
        ...style,
        ...compatibleData
    };

    return env.render(templateName, fullContextPayload);
}

