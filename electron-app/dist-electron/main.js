import { exec } from "child_process";
import { BrowserWindow, app, dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import util from "util";
import nunjucks from "nunjucks";
//#region src/lib/escaper.ts
var DEFAULT_PROTECTED_TERMS = [
	"Kubernetes",
	"Docker",
	"Terraform",
	"Airflow",
	"Kafka",
	"Spark",
	"Redshift",
	"PostgreSQL",
	"MongoDB",
	"FastAPI",
	"XGBoost",
	"LightGBM",
	"Snowflake",
	"Grafana",
	"Prometheus",
	"Jenkins",
	"GitHub",
	"GitLab",
	"Tableau",
	"Streamlit",
	"Boto3",
	"Python",
	"JavaScript",
	"TypeScript",
	"auto-scaling",
	"ETL",
	"GenAI",
	"LLMs",
	"ChatGPT",
	"OpenAI",
	"machine learning",
	"deep learning",
	"data engineering",
	"MLOps",
	"microservices",
	"serverless",
	"real-time",
	"end-to-end"
];
var DEFAULT_CHAR_MAP = {
	"&": "\\&",
	"%": "\\%",
	"$": "\\$",
	"#": "\\#",
	"_": "\\_",
	"{": "\\{",
	"}": "\\}",
	"~": "\\textasciitilde{}",
	"^": "\\^{}"
};
var LatexCharEscaper = class {
	charMap;
	constructor(charMap) {
		this.charMap = charMap;
	}
	escape(text) {
		let result = text;
		result = result.replace(/->/g, "<<<ARROW>>>");
		result = result.replace(/---/g, "<<<EMDASH>>>");
		result = result.replace(/--/g, "<<<ENDASH>>>");
		const pattern = new RegExp(`([${Object.keys(this.charMap).map((c) => "\\" + c).join("")}])`, "g");
		result = result.replace(pattern, (match) => this.charMap[match]);
		result = result.replace(/<<<ARROW>>>/g, "$\\rightarrow$");
		result = result.replace(/<<<ENDASH>>>/g, "--");
		result = result.replace(/<<<EMDASH>>>/g, "---");
		return result;
	}
};
var MarkupConverter = class {
	convert(text) {
		let result = text;
		result = result.replace(/\*\*\*(.+?)\*\*\*/g, (_, p1) => `\\textbf{\\textit{${p1}}}`);
		result = result.replace(/\*\*(.+?)\*\*/g, (_, p1) => `\\textbf{${p1}}`);
		result = result.replace(/\*([^*\n]+?)\*/g, (_, p1) => `\\textit{${p1}}`);
		return result;
	}
};
var TermProtector = class {
	protectedTerms;
	track;
	constructor(terms, track = true) {
		this.track = track;
		this.protectedTerms = new Set(terms.filter((t) => t.trim().length > 0));
	}
	protect(text) {
		if (this.protectedTerms.size === 0) return text;
		let result = text;
		for (const term of this.protectedTerms) {
			const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`\\b(${escapedTerm})\\b`, "gi");
			result = result.replace(regex, (match) => {
				return `\\mbox{${match}}`;
			});
		}
		return result;
	}
};
var LatexEscaper = class {
	charEscaper;
	markupConverter;
	termProtector;
	constructor(extraTerms = []) {
		this.charEscaper = new LatexCharEscaper(DEFAULT_CHAR_MAP);
		this.markupConverter = new MarkupConverter();
		this.termProtector = new TermProtector([...DEFAULT_PROTECTED_TERMS, ...extraTerms], true);
	}
	escape(text) {
		if (!text || typeof text !== "string") return text;
		let result = this.charEscaper.escape(text);
		result = this.markupConverter.convert(result);
		result = this.termProtector.protect(result);
		return result;
	}
	recursiveEscape = (val) => {
		if (typeof val === "string") return this.escape(val);
		if (Array.isArray(val)) return val.map((item) => this.recursiveEscape(item)).filter((item) => item !== void 0 && item !== "");
		if (val && typeof val === "object") {
			const escapedObj = {};
			for (const [key, value] of Object.entries(val)) escapedObj[key] = this.recursiveEscape(value);
			return escapedObj;
		}
		return val;
	};
};
var defaultEscaper = new LatexEscaper();
//#endregion
//#region src/lib/builder.ts
if (!String.prototype.rstrip) String.prototype.rstrip = function(chars) {
	if (!chars) return this.trimEnd();
	const escaped = chars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`[${escaped}]+$`);
	return this.replace(regex, "");
};
if (!String.prototype.lstrip) String.prototype.lstrip = function(chars) {
	if (!chars) return this.trimStart();
	const escaped = chars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`^[${escaped}]+`);
	return this.replace(regex, "");
};
if (!String.prototype.startswith) String.prototype.startswith = String.prototype.startsWith;
if (!String.prototype.endswith) String.prototype.endswith = String.prototype.endsWith;
if (!String.prototype.upper) String.prototype.upper = String.prototype.toUpperCase;
if (!String.prototype.lower) String.prototype.lower = String.prototype.toLowerCase;
var originalSplit = String.prototype.split;
String.prototype.split = function(separator, limit) {
	const res = originalSplit.call(this, separator, limit);
	Object.defineProperty(res, "-1", {
		get: function() {
			return this[this.length - 1];
		},
		enumerable: false,
		configurable: true
	});
	return res;
};
var defaultStyleConfig = {
	font: "Calibri",
	font_size: 11,
	section_color: [
		96,
		36,
		191
	],
	margin_tb: .5,
	margin_lr: .6,
	item_spacing: 2,
	section_spacing: 10,
	entry_spacing: 8,
	bullet_indent: 1.2,
	bullet: "•",
	use_icons: false,
	extra_protected_terms: []
};
/**
* Configure Nunjucks Environment with LaTeX-safe delimiters
* Equivalent to python's JinjaEnvConfigurator
*/
function buildNunjucksEnv(templateDir, style, escaper) {
	const loader = new nunjucks.FileSystemLoader(templateDir, { noCache: true });
	const env = new nunjucks.Environment(loader, {
		tags: {
			blockStart: "<%",
			blockEnd: "%>",
			variableStart: "<<",
			variableEnd: ">>",
			commentStart: "<#",
			commentEnd: "#>"
		},
		trimBlocks: true,
		lstripBlocks: true,
		autoescape: false
	});
	env.addFilter("escape_latex", (val) => escaper.recursiveEscape(val));
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
function addPythonGetPolyfill(obj) {
	if (obj !== null && typeof obj === "object") if (Array.isArray(obj)) obj.forEach(addPythonGetPolyfill);
	else {
		if (!obj.get) Object.defineProperty(obj, "get", {
			value: function(key, defaultValue = null) {
				return this[key] !== void 0 ? this[key] : defaultValue;
			},
			enumerable: false,
			writable: true,
			configurable: true
		});
		for (const key of Object.keys(obj)) addPythonGetPolyfill(obj[key]);
	}
	return obj;
}
/**
* Main function to generate the final LaTeX string from JSON data.
* Think of it as the JinjaLatexDocumentBuilder logic.
*/
function buildLatex(data, templateDir, templateName, style = defaultStyleConfig, escaper = new LatexEscaper()) {
	const env = buildNunjucksEnv(templateDir, style, escaper);
	const compatibleData = addPythonGetPolyfill(escaper.recursiveEscape(data));
	const fullContextPayload = {
		...style,
		...compatibleData
	};
	return env.render(templateName, fullContextPayload);
}
//#endregion
//#region electron/main.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var execAsync = util.promisify(exec);
var currentAbortController = null;
var mainWindow = null;
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1680,
		height: 1e3,
		title: "Resume Generator",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: false,
			webSecurity: false
		}
	});
	mainWindow.setMenu(null);
	if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("log-level", "3");
app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("open-json", async () => {
	if (!mainWindow) return {
		success: false,
		error: "No window"
	};
	const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
		title: "Open Resume JSON",
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}],
		properties: ["openFile"]
	});
	if (canceled || filePaths.length === 0) return {
		success: false,
		canceled: true
	};
	try {
		return {
			success: true,
			data: fs.readFileSync(filePaths[0], "utf-8"),
			filePath: filePaths[0]
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
});
ipcMain.handle("save-json", async (event, content, defaultPath) => {
	if (!mainWindow) return {
		success: false,
		error: "No window"
	};
	const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
		title: "Save Resume JSON",
		defaultPath: defaultPath || "resume.json",
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}]
	});
	if (canceled || !filePath) return {
		success: false,
		canceled: true
	};
	try {
		fs.writeFileSync(filePath, content, "utf-8");
		return {
			success: true,
			filePath
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
});
ipcMain.handle("generate-pdf", async (event, data, templateName = "classic.tex", styleConfig) => {
	try {
		if (currentAbortController) {
			console.log("Cancelling previous compilation job...");
			currentAbortController.abort();
		}
		currentAbortController = new AbortController();
		const { signal } = currentAbortController;
		const jobId = Date.now().toString();
		const buildDir = path.join(app.getPath("temp"), "resume-builder");
		if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
		fs.readdir(buildDir, (err, files) => {
			if (!err) files.forEach((f) => {
				const fp = path.join(buildDir, f);
				fs.stat(fp, (e, stats) => {
					if (!e && stats.mtimeMs < Date.now() - 36e5) fs.unlink(fp, () => {});
				});
			});
		});
		const templatesDir = path.join(app.getAppPath(), "../templates");
		const finalStyle = {
			...defaultStyleConfig,
			...styleConfig || {}
		};
		try {
			console.log("PDF GEN DATA SKILLS:", JSON.stringify(data.skills, null, 2));
			console.log("PDF GEN DATA PROJECTS:", JSON.stringify(data.projects, null, 2));
		} catch (e) {}
		const latexContent = buildLatex(data, templatesDir, templateName, finalStyle, defaultEscaper);
		const texFilePath = path.join(buildDir, `output-${jobId}.tex`);
		const pdfPath = path.join(buildDir, `output-${jobId}.pdf`);
		fs.writeFileSync(texFilePath, latexContent, "utf-8");
		const compileCmd = `latexmk -f -xelatex -interaction=nonstopmode -output-directory="${buildDir}" "${texFilePath}"`;
		console.log(`Running latexmk compilation... (Job: ${jobId})`);
		try {
			await execAsync(compileCmd, { signal });
		} catch (execErr) {
			if (execErr.name === "AbortError") {
				console.log(`Job ${jobId} was cancelled.`);
				return {
					success: false,
					error: "Compilation Cancelled",
					canceled: true
				};
			}
			console.warn("latexmk produced warnings/errors, checking if PDF was generated...", execErr.message?.substring(0, 200));
		}
		if (!fs.existsSync(pdfPath)) throw new Error("PDF file was not found after compilation.");
		return {
			success: true,
			pdfPath: `file://${pdfPath}`.replace(/\\/g, "/")
		};
	} catch (error) {
		console.error("PDF Generation Error:", error);
		return {
			success: false,
			error: error.message || error.toString()
		};
	}
});
ipcMain.handle("save-pdf", async (event, pdfUrl) => {
	if (!mainWindow) return {
		success: false,
		error: "No window"
	};
	const cleanUrl = pdfUrl.split("?")[0];
	const sourcePath = fileURLToPath(cleanUrl);
	const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
		title: "Save PDF",
		defaultPath: "resume.pdf",
		filters: [{
			name: "PDF Files",
			extensions: ["pdf"]
		}]
	});
	if (canceled || !filePath) return {
		success: false,
		canceled: true
	};
	try {
		fs.copyFileSync(sourcePath, filePath);
		return {
			success: true,
			filePath
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
});
//#endregion
