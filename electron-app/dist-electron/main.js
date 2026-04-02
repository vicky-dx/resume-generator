import { exec as e } from "child_process";
import { BrowserWindow as t, app as n, dialog as r, ipcMain as i } from "electron";
import a from "fs";
import o from "path";
import { fileURLToPath as s } from "url";
import c from "util";
import l from "nunjucks";
//#region src/lib/escaper.ts
var u = /* @__PURE__ */ "Kubernetes.Docker.Terraform.Airflow.Kafka.Spark.Redshift.PostgreSQL.MongoDB.FastAPI.XGBoost.LightGBM.Snowflake.Grafana.Prometheus.Jenkins.GitHub.GitLab.Tableau.Streamlit.Boto3.Python.JavaScript.TypeScript.auto-scaling.ETL.GenAI.LLMs.ChatGPT.OpenAI.machine learning.deep learning.data engineering.MLOps.microservices.serverless.real-time.end-to-end".split("."), d = {
	"&": "\\&",
	"%": "\\%",
	$: "\\$",
	"#": "\\#",
	_: "\\_",
	"{": "\\{",
	"}": "\\}",
	"~": "\\textasciitilde{}",
	"^": "\\^{}"
}, f = class {
	charMap;
	constructor(e) {
		this.charMap = e;
	}
	escape(e) {
		let t = e;
		t = t.replace(/->/g, "<<<ARROW>>>"), t = t.replace(/---/g, "<<<EMDASH>>>"), t = t.replace(/--/g, "<<<ENDASH>>>");
		let n = RegExp(`([${Object.keys(this.charMap).map((e) => "\\" + e).join("")}])`, "g");
		return t = t.replace(n, (e) => this.charMap[e]), t = t.replace(/<<<ARROW>>>/g, "$\\rightarrow$"), t = t.replace(/<<<ENDASH>>>/g, "--"), t = t.replace(/<<<EMDASH>>>/g, "---"), t;
	}
}, p = class {
	convert(e) {
		let t = e;
		return t = t.replace(/\*\*\*(.+?)\*\*\*/g, (e, t) => `\\textbf{\\textit{${t}}}`), t = t.replace(/\*\*(.+?)\*\*/g, (e, t) => `\\textbf{${t}}`), t = t.replace(/\*([^*\n]+?)\*/g, (e, t) => `\\textit{${t}}`), t;
	}
}, m = class {
	protectedTerms;
	track;
	constructor(e, t = !0) {
		this.track = t, this.protectedTerms = new Set(e.filter((e) => e.trim().length > 0));
	}
	protect(e) {
		if (this.protectedTerms.size === 0) return e;
		let t = e;
		for (let e of this.protectedTerms) {
			let n = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), r = RegExp(`\\b(${n})\\b`, "gi");
			t = t.replace(r, (e) => `\\mbox{${e}}`);
		}
		return t;
	}
}, h = class {
	charEscaper;
	markupConverter;
	termProtector;
	constructor(e = []) {
		this.charEscaper = new f(d), this.markupConverter = new p(), this.termProtector = new m([...u, ...e], !0);
	}
	escape(e) {
		if (!e || typeof e != "string") return e;
		let t = this.charEscaper.escape(e);
		return t = this.markupConverter.convert(t), t = this.termProtector.protect(t), t;
	}
	recursiveEscape = (e) => {
		if (typeof e == "string") return this.escape(e);
		if (Array.isArray(e)) return e.map((e) => this.recursiveEscape(e)).filter((e) => e !== void 0 && e !== "");
		if (e && typeof e == "object") {
			let t = {};
			for (let [n, r] of Object.entries(e)) t[n] = this.recursiveEscape(r);
			return t;
		}
		return e;
	};
}, g = new h();
String.prototype.rstrip || (String.prototype.rstrip = function(e) {
	if (!e) return this.trimEnd();
	let t = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), n = RegExp(`[${t}]+$`);
	return this.replace(n, "");
}), String.prototype.lstrip || (String.prototype.lstrip = function(e) {
	if (!e) return this.trimStart();
	let t = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), n = RegExp(`^[${t}]+`);
	return this.replace(n, "");
}), String.prototype.startswith || (String.prototype.startswith = String.prototype.startsWith), String.prototype.endswith || (String.prototype.endswith = String.prototype.endsWith), String.prototype.upper || (String.prototype.upper = String.prototype.toUpperCase), String.prototype.lower || (String.prototype.lower = String.prototype.toLowerCase);
var _ = String.prototype.split;
String.prototype.split = function(e, t) {
	let n = _.call(this, e, t);
	return Object.defineProperty(n, "-1", {
		get: function() {
			return this[this.length - 1];
		},
		enumerable: !1,
		configurable: !0
	}), n;
};
var v = {
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
	use_icons: !1,
	extra_protected_terms: []
};
function y(e, t, n) {
	let r = new l.FileSystemLoader(e, { noCache: !0 }), i = new l.Environment(r, {
		tags: {
			blockStart: "<%",
			blockEnd: "%>",
			variableStart: "<<",
			variableEnd: ">>",
			commentStart: "<#",
			commentEnd: "#>"
		},
		trimBlocks: !0,
		lstripBlocks: !0,
		autoescape: !1
	});
	return i.addFilter("escape_latex", (e) => n.recursiveEscape(e)), i.addGlobal("font", t.font), i.addGlobal("font_size", t.font_size), i.addGlobal("section_color", t.section_color), i.addGlobal("margin_tb", t.margin_tb), i.addGlobal("margin_lr", t.margin_lr), i.addGlobal("item_spacing", t.item_spacing), i.addGlobal("section_spacing", t.section_spacing), i.addGlobal("entry_spacing", t.entry_spacing), i.addGlobal("bullet_indent", t.bullet_indent), i.addGlobal("bullet", t.bullet), i.addGlobal("use_icons", t.use_icons), i;
}
function b(e) {
	if (typeof e == "object" && e) if (Array.isArray(e)) e.forEach(b);
	else {
		e.get || Object.defineProperty(e, "get", {
			value: function(e, t = null) {
				return this[e] === void 0 ? t : this[e];
			},
			enumerable: !1,
			writable: !0,
			configurable: !0
		});
		for (let t of Object.keys(e)) b(e[t]);
	}
	return e;
}
function x(e, t, n, r = v, i = new h()) {
	let a = y(t, r, i), o = b(i.recursiveEscape(e)), s = {
		...r,
		...o
	};
	return a.render(n, s);
}
//#endregion
//#region electron/main.ts
var S = s(import.meta.url), C = o.dirname(S), w = c.promisify(e), T = null;
function E() {
	T = new t({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: o.join(C, "preload.js"),
			nodeIntegration: !1,
			contextIsolation: !0,
			sandbox: !1,
			webSecurity: !1
		}
	}), T.setMenu(null), process.env.VITE_DEV_SERVER_URL ? T.loadURL(process.env.VITE_DEV_SERVER_URL) : T.loadFile(o.join(C, "../dist/index.html"));
}
n.disableHardwareAcceleration(), n.commandLine.appendSwitch("log-level", "3"), n.whenReady().then(() => {
	E(), n.on("activate", () => {
		t.getAllWindows().length === 0 && E();
	});
}), n.on("window-all-closed", () => {
	process.platform !== "darwin" && n.quit();
}), i.handle("open-json", async () => {
	if (!T) return {
		success: !1,
		error: "No window"
	};
	let { canceled: e, filePaths: t } = await r.showOpenDialog(T, {
		title: "Open Resume JSON",
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}],
		properties: ["openFile"]
	});
	if (e || t.length === 0) return {
		success: !1,
		canceled: !0
	};
	try {
		return {
			success: !0,
			data: a.readFileSync(t[0], "utf-8"),
			filePath: t[0]
		};
	} catch (e) {
		return {
			success: !1,
			error: e.message
		};
	}
}), i.handle("save-json", async (e, t, n) => {
	if (!T) return {
		success: !1,
		error: "No window"
	};
	let { canceled: i, filePath: o } = await r.showSaveDialog(T, {
		title: "Save Resume JSON",
		defaultPath: n || "resume.json",
		filters: [{
			name: "JSON Files",
			extensions: ["json"]
		}]
	});
	if (i || !o) return {
		success: !1,
		canceled: !0
	};
	try {
		return a.writeFileSync(o, t, "utf-8"), {
			success: !0,
			filePath: o
		};
	} catch (e) {
		return {
			success: !1,
			error: e.message
		};
	}
}), i.handle("generate-pdf", async (e, t, r = "classic.tex", i) => {
	try {
		let e = o.join(n.getPath("temp"), "resume-builder");
		a.existsSync(e) || a.mkdirSync(e, { recursive: !0 });
		let s = x(t, o.join(n.getAppPath(), "../templates"), r, {
			...v,
			...i || {}
		}, g), c = o.join(e, "output.tex");
		a.writeFileSync(c, s, "utf-8");
		let l = `xelatex -interaction=nonstopmode -output-directory="${e}" "${c}"`;
		return console.log("First LaTeX compilation pass..."), await w(l), console.log("Second LaTeX compilation pass..."), await w(l), {
			success: !0,
			pdfPath: `file://${o.join(e, "output.pdf")}`.replace(/\\/g, "/")
		};
	} catch (e) {
		return console.error("PDF Generation Error:", e), {
			success: !1,
			error: e.message || e.toString()
		};
	}
}), i.handle("save-pdf", async (e, t) => {
	if (!T) return {
		success: !1,
		error: "No window"
	};
	let n = t.split("?")[0], i = s(n), { canceled: o, filePath: c } = await r.showSaveDialog(T, {
		title: "Save PDF",
		defaultPath: "resume.pdf",
		filters: [{
			name: "PDF Files",
			extensions: ["pdf"]
		}]
	});
	if (o || !c) return {
		success: !1,
		canceled: !0
	};
	try {
		return a.copyFileSync(i, c), {
			success: !0,
			filePath: c
		};
	} catch (e) {
		return {
			success: !1,
			error: e.message
		};
	}
});
//#endregion
