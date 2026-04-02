/* eslint-disable @typescript-eslint/no-explicit-any */
export const DEFAULT_PROTECTED_TERMS = [
    "Kubernetes", "Docker", "Terraform", "Airflow", "Kafka", "Spark",
    "Redshift", "PostgreSQL", "MongoDB", "FastAPI", "XGBoost", "LightGBM",
    "Snowflake", "Grafana", "Prometheus", "Jenkins", "GitHub", "GitLab",
    "Tableau", "Streamlit", "Boto3", "Python", "JavaScript", "TypeScript",
    "auto-scaling", "ETL", "GenAI", "LLMs", "ChatGPT", "OpenAI",
    "machine learning", "deep learning", "data engineering", "MLOps",
    "microservices", "serverless", "real-time", "end-to-end",
];

const DEFAULT_CHAR_MAP: Record<string, string> = {
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\^{}",
};

class LatexCharEscaper {
    private charMap: Record<string, string>;
    constructor(charMap: Record<string, string>) { this.charMap = charMap; }

    escape(text: string): string {
        let result = text;
        // Protect arrow/dash sequences
        result = result.replace(/->/g, "<<<ARROW>>>");
        result = result.replace(/---/g, "<<<EMDASH>>>");
        result = result.replace(/--/g, "<<<ENDASH>>>");

        // Replace special chars one by one
        // Convert keys to a regex pattern like /([&%$#_{}~^])/g
        const pattern = new RegExp(`([${Object.keys(this.charMap).map(c => '\\' + c).join('')}])`, 'g');
        result = result.replace(pattern, (match) => this.charMap[match]);

        // Restore protected sequences
        result = result.replace(/<<<ARROW>>>/g, "$\\rightarrow$");
        result = result.replace(/<<<ENDASH>>>/g, "--");
        result = result.replace(/<<<EMDASH>>>/g, "---");

        return result;
    }
}

class MarkupConverter {
    convert(text: string): string {
        let result = text;

        // Bold + Italic: ***text***
        result = result.replace(/\*\*\*(.+?)\*\*\*/g, (_, p1) => `\\textbf{\\textit{${p1}}}`);

        // Bold: **text**
        result = result.replace(/\*\*(.+?)\*\*/g, (_, p1) => `\\textbf{${p1}}`);

        // Italic: *text* -> note: making sure we don't match empty string or newlines inside
        result = result.replace(/\*([^*\n]+?)\*/g, (_, p1) => `\\textit{${p1}}`);

        return result;
    }
}

class TermProtector {
    private protectedTerms: Set<string>;
    public track: boolean;

    constructor(terms: string[], track: boolean = true) {
        this.track = track;
        this.protectedTerms = new Set(terms.filter(t => t.trim().length > 0));
    }

    protect(text: string): string {
        if (this.protectedTerms.size === 0) return text;

        let result = text;
        for (const term of this.protectedTerms) {
            // Escape special regex characters in the term
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Match whole words only
            const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
            result = result.replace(regex, (match) => {
                // Simple heuristic: don't wrap if already inside an mbox (prevent overlap)
                return `\\mbox{${match}}`;
            });
        }
        return result;
    }
}

export class LatexEscaper {
    private charEscaper: LatexCharEscaper;
    private markupConverter: MarkupConverter;
    private termProtector: TermProtector;

    constructor(extraTerms: string[] = []) {
        this.charEscaper = new LatexCharEscaper(DEFAULT_CHAR_MAP);
        this.markupConverter = new MarkupConverter();

        const allTerms = [...DEFAULT_PROTECTED_TERMS, ...extraTerms];
        this.termProtector = new TermProtector(allTerms, true);
    }

    escape(text: string): string {
        if (!text || typeof text !== "string") return text;

        // 1. Escape special characters everywhere else first
        // This safely escapes `%`, `&`, `_`, etc., before adding LaTeX code.
        let result = this.charEscaper.escape(text);

        // 2. Convert markdown to LaTeX markup (`**bold**` -> `\textbf{bold}`)
        // Doing this AFTER charEscaper prevents `charEscaper` from escaping the `{` and `}` added here!
        result = this.markupConverter.convert(result);

        // 3. Protect terms (wrap in mbox)
        result = this.termProtector.protect(result);

        return result;
    }

    // Recursive escape for Nunjucks filter
    recursiveEscape = (val: any): any => {
        if (typeof val === "string") {
            return this.escape(val);
        }
        if (Array.isArray(val)) {
            // Filter out empty strings so accidental empty lines in FormEditor don't create empty LaTeX bullet points
            return val.map((item) => this.recursiveEscape(item)).filter(item => item !== undefined && item !== "");
        }
        if (val && typeof val === "object") {
            const escapedObj: Record<string, any> = {};
            for (const [key, value] of Object.entries(val)) {
                escapedObj[key] = this.recursiveEscape(value);
            }
            return escapedObj;
        }
        return val;
    };
}

// Global default instance for convenience
export const defaultEscaper = new LatexEscaper();
