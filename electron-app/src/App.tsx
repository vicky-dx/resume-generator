import Editor from "@monaco-editor/react";
import { Code2, FileDown, FolderOpen, ListTree, Loader2, Play, Save, Settings2, X } from "lucide-react";
import { useCallback, useState } from "react";
import FormEditor from "./components/FormEditor";

const defaultJSON = `{
  "personal_info": {
    "name": "Jane Doe",
    "location": "San Francisco, CA",
    "email": "jane@example.com"
  },
  "summary": "Passionate Software Engineer.",
  "experience": [
    {
      "company": "Tech Corp",
      "position": "Senior Developer",
      "duration": "2021 - Present",
      "achievements": [
        "Led a team of 5",
        "Built a microservices architecture"
      ]
    }
  ]
}`;

// Helper to convert hex to RGB array
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [96, 36, 191]; // Default purple
};

const rgbToHex = (rgb: number[]) => {
  return "#" + rgb.map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
};

function App() {
  const [jsonText, setJsonText] = useState(defaultJSON);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"json" | "form">("form");

  // Tweaks state
  const [showTweaks, setShowTweaks] = useState(false);
  const [templateName, setTemplateName] = useState("classic.tex");
  const [styleConfig, setStyleConfig] = useState({
    font: "Calibri",
    font_size: 11,
    margin_tb: 0.5,
    margin_lr: 0.5,
    item_spacing: 0.5,
    section_spacing: 6,
    entry_spacing: 3,
    bullet_indent: 1.2,
    bullet: "$\\bullet$",
    section_color: [96, 36, 191],
    extra_protected_terms: "",
    use_icons: true,
  });

  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: unknown, type: string } }) => {
    const target = e.target;
    const name = target.name;
    const type = target.type;

    let value: string | boolean | number = target.value as string | boolean | number;
    if (type === "checkbox") value = (target as HTMLInputElement).checked;
    if (type === "number") value = parseFloat(value as string);

    setStyleConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    setErrorMsg(null);

    try {
      // 1. Parse JSON input
      const data = JSON.parse(jsonText);

      // Pre-process extra protected terms into an array before sending
      const finalStyleConfig = {
        ...styleConfig,
        extra_protected_terms: styleConfig.extra_protected_terms
          ? styleConfig.extra_protected_terms.split(",").map(t => t.trim()).filter(Boolean)
          : []
      };

      // 2. Send via IPC to Electron Main Process
      const result = await window.electronAPI.generatePdf(data, templateName, finalStyleConfig);

      if (result.success) {
        setPdfUrl(`${result.pdfPath}?t=${Date.now()}`);
      } else {
        setErrorMsg(result.error || "Unknown compilation error");
      }
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        setErrorMsg("Invalid JSON: " + e.message);
      } else {
        setErrorMsg((e as Error).message);
      }
    } finally {
      setIsCompiling(false);
    }
  }, [jsonText, templateName, styleConfig]);


  const handleOpenJson = async () => {
    const result = await window.electronAPI.openJson();
    if (result.success && result.data) {
      setJsonText(result.data);
    }
  };

  const handleSaveJson = async () => {
    await window.electronAPI.saveJson(jsonText);
  };

  return (
    <div className="flex h-screen w-full bg-neutral-920 text-neutral-100 overflow-hidden font-sans">

      {/* LEFT PANE - Editor */}
      <div className="w-1/2 flex flex-col border-r border-neutral-800 bg-[#1e1e1e] relative">
        <div className="h-10 bg-neutral-900 border-b border-black flex items-center px-4 justify-between select-none">
          <div className="flex gap-1 bg-neutral-950 p-1 rounded">
            <button
              onClick={() => setViewMode("form")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${viewMode === 'form' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <ListTree className="w-3.5 h-3.5" /> Form
            </button>
            <button
              onClick={() => setViewMode("json")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${viewMode === 'json' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <Code2 className="w-3.5 h-3.5" /> JSON
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenJson}
              className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[11px] text-neutral-300 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3 h-3" /> OPEN
            </button>
            <button
              onClick={handleSaveJson}
              className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[11px] text-neutral-300 transition-colors cursor-pointer"
            >
              <Save className="w-3 h-3" /> SAVE
            </button>
            <div className="w-px h-4 bg-neutral-700 mx-1"></div>

            <button
              onClick={() => setShowTweaks(!showTweaks)}
              className="flex items-center gap-2 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3 h-3" />
              TWEAKS
            </button>
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 rounded text-xs text-white transition-colors cursor-pointer"
            >
              {isCompiling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              {isCompiling ? "COMPILING" : "COMPILE"}
            </button>
          </div>
        </div>

        {/* Tweaks Panel */}
        {showTweaks && (
          <div className="absolute top-10 left-0 w-full bg-neutral-900 border-b border-black z-20 shadow-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 select-none overflow-y-auto max-h-[80vh]">

            {/* Header */}
            <div className="flex justify-between items-center mb-1 border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-neutral-300">STYLING TWEAKS</span>
              <button
                onClick={() => setShowTweaks(false)}
                title="Close Tweaks"
                className="text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ROW 1: General Styling */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                Style
              </div>
              <div className="flex flex-wrap items-center gap-4 bg-neutral-950/50 p-2.5 rounded border border-neutral-800">

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  Template:
                  <select
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 focus:border-blue-500 outline-none rounded px-2 py-1 text-white text-xs cursor-pointer min-w-[120px]"
                  >
                    <option value="classic.tex">classic.tex</option>
                    <option value="experiment.tex">experiment.tex</option>
                  </select>
                </label>

                <div className="w-px h-4 bg-neutral-800"></div>

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  Font:
                  <select
                    name="font"
                    value={styleConfig.font}
                    onChange={handleStyleChange}
                    className="bg-neutral-900 border border-neutral-700 focus:border-blue-500 outline-none rounded px-2 py-1 text-white text-xs cursor-pointer min-w-[120px]"
                  >
                    <option value="Calibri">Calibri</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Garamond">Garamond</option>
                    <option value="Palatino Linotype">Palatino</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  Size:
                  <div className="flex items-center gap-2">
                    <input type="range" min="8" max="16" step="0.5" name="font_size" value={styleConfig.font_size} onChange={handleStyleChange} className="w-24 accent-blue-500" />
                    <span className="text-blue-400 w-6 font-mono text-[10px]">{styleConfig.font_size}</span>
                  </div>
                </label>
                <div className="w-px h-4 bg-neutral-800"></div>

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  Colour:
                  <input
                    type="color"
                    name="section_color"
                    value={rgbToHex(styleConfig.section_color as number[])}
                    onChange={(e) => handleStyleChange({ target: { name: 'section_color', value: hexToRgb(e.target.value), type: 'color' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded"
                  />
                </label>
              </div>
            </div>

            {/* ROW 2: Layout */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Layout
              </div>
              <div className="flex flex-wrap items-center gap-4 bg-neutral-950/50 p-2.5 rounded border border-neutral-800">

                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">Margins:</span>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                    TB:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="1.5" step="0.1" name="margin_tb" value={styleConfig.margin_tb} onChange={handleStyleChange} className="w-20 accent-blue-500" />
                      <span className="text-blue-400 w-4 font-mono text-[10px]">{styleConfig.margin_tb}</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                    LR:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="1.5" step="0.1" name="margin_lr" value={styleConfig.margin_lr} onChange={handleStyleChange} className="w-20 accent-blue-500" />
                      <span className="text-blue-400 w-4 font-mono text-[10px]">{styleConfig.margin_lr}</span>
                    </div>
                  </label>
                </div>

                <div className="w-px h-4 bg-neutral-800"></div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">Gaps:</span>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                    Section:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="25" step="1" name="section_spacing" value={styleConfig.section_spacing} onChange={handleStyleChange} className="w-20 accent-blue-500" />
                      <span className="text-blue-400 w-4 font-mono text-[10px]">{styleConfig.section_spacing}</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                    Entry:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="20" step="1" name="entry_spacing" value={styleConfig.entry_spacing} onChange={handleStyleChange} className="w-20 accent-blue-500" />
                      <span className="text-blue-400 w-4 font-mono text-[10px]">{styleConfig.entry_spacing}</span>
                    </div>
                  </label>
                </div>

                <div className="w-px h-4 bg-neutral-800"></div>

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  Line Spacing:
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="10" step="0.5" name="item_spacing" value={styleConfig.item_spacing} onChange={handleStyleChange} className="w-20 accent-blue-500" />
                    <span className="text-blue-400 w-6 font-mono text-[10px]">{styleConfig.item_spacing}</span>
                  </div>
                </label>

              </div>
            </div>

            {/* ROW 3: Details */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Details
              </div>
              <div className="flex flex-wrap items-center gap-4 bg-neutral-950/50 p-2.5 rounded border border-neutral-800">

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  Bullet:
                  <select
                    name="bullet"
                    value={styleConfig.bullet}
                    onChange={handleStyleChange}
                    className="bg-neutral-900 border border-neutral-700 focus:border-blue-500 outline-none rounded px-2 py-1 text-white text-xs cursor-pointer min-w-[100px] font-mono"
                  >
                    <option value="$\bullet$">• bullet</option>
                    <option value="$\circ$">○ circ</option>
                    <option value="-">- dash</option>
                    <option value="$\ast$">∗ ast</option>
                    <option value="$\cdot$">· cdot</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  Indent:
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="5" step="0.1" name="bullet_indent" value={styleConfig.bullet_indent} onChange={handleStyleChange} className="w-16 accent-blue-500" />
                    <span className="text-blue-400 w-6 font-mono text-[10px]">{styleConfig.bullet_indent}</span>
                  </div>
                </label>
                <div className="w-px h-4 bg-neutral-800"></div>

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" name="use_icons" checked={styleConfig.use_icons} onChange={handleStyleChange} className="w-4 h-4 rounded bg-neutral-950 border border-neutral-700 text-blue-500 focus:ring-blue-500 focus:ring-1 cursor-pointer" />
                  Icons (fa5)
                </label>

                <div className="w-px h-4 bg-neutral-800"></div>

                <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium flex-1 min-w-[200px]">
                  Protect:
                  <input type="text" name="extra_protected_terms" placeholder="e.g. React, AWS" value={styleConfig.extra_protected_terms} onChange={handleStyleChange} className="bg-neutral-900 border border-neutral-700 focus:border-blue-500 outline-none rounded px-2 py-1 text-white text-xs w-full placeholder:text-neutral-600" />
                </label>

              </div>
            </div>

          </div>
        )}

        {viewMode === "json" ? (
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="json"
              theme="vs-dark"
              value={jsonText}
              onChange={(val) => setJsonText(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: "on",
                formatOnPaste: true,
                padding: { top: 16 }
              }}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col bg-[#1a1a1a]">
            {/* Form Editor Wrapper */}
            <FormEditor jsonText={jsonText} onChange={(newJson) => setJsonText(newJson)} />
          </div>
        )}

        {errorMsg && (
          <div className="absolute bottom-0 left-0 w-full bg-red-950/90 text-red-200 p-4 text-xs border-t border-red-900 z-10">
            <p className="font-bold flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Compilation Error
            </p>
            <pre className="whitespace-pre-wrap font-mono mt-2 opacity-80">{errorMsg}</pre>
          </div>
        )}
      </div>

      {/* RIGHT PANE - PDF Preview */}
      <div className="w-1/2 flex flex-col bg-neutral-800 relative">
        <div className="h-10 bg-neutral-900 border-b border-black flex items-center px-4 justify-between select-none">
          <div className="text-xs font-semibold text-neutral-400 tracking-wider">PDF PREVIEW</div>
          <button
            onClick={() => pdfUrl && window.electronAPI.savePdf(pdfUrl)}
            disabled={!pdfUrl}
            className={`flex items-center gap-1.5 transition-colors ${pdfUrl ? 'text-neutral-300 hover:text-white cursor-pointer' : 'text-neutral-600 cursor-not-allowed'}`}
            title="Download PDF"
          >
            <FileDown className="w-3 h-3" />
            <span className="text-xs uppercase">Download</span>
          </button>
        </div>

        <div className="flex-1 bg-[#525659] flex justify-center w-full h-full relative">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none m-0 p-0"
              title="PDF Preview"
            />
          ) : (
            <div className="m-auto flex items-center flex-col text-neutral-400 gap-3 opacity-50">
              <FileDown className="w-12 h-12" />
              <div className="text-sm">No PDF Generated</div>
            </div>
          )}

          {isCompiling && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <div className="bg-neutral-900 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 border border-neutral-700">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-sm font-medium text-neutral-300 tracking-wide animate-pulse">Running xelatex...</span>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;
