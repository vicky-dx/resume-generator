import Editor from "@monaco-editor/react";
import debounce from "lodash/debounce";
import { Code2, FileDown, FolderOpen, ListTree, Loader2, Play, Save, Settings2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import FormEditor from "./components/FormEditor";
import { useCompileStatus } from "./hooks/useCompileStatus";

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

const parseLatexError = (rawLog: string): string => {
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
};

function App() {
  const [jsonText, setJsonText] = useState(defaultJSON);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);
  const { setStatus, errorMsg, setErrorMsg, isCompiling } = useCompileStatus();
  const [viewMode, setViewMode] = useState<"json" | "form">("form");

  // Tweaks state
  const [showTweaks, setShowTweaks] = useState(false);
  const tweaksPanelRef = useRef<HTMLDivElement>(null);
  const tweaksBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tweaksPanelRef.current &&
        !tweaksPanelRef.current.contains(event.target as Node) &&
        tweaksBtnRef.current &&
        !tweaksBtnRef.current.contains(event.target as Node)
      ) {
        setShowTweaks(false);
      }
    };

    if (showTweaks) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTweaks]);

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

  const getElectronAPI = () => {
    if (!window.electronAPI) {
      throw new Error("Electron API is unavailable. Launch the app through the Electron desktop app or the Electron dev script.");
    }

    return window.electronAPI;
  };

  const compileResume = async (currentJsonText: string, currentTemplate: string, currentStyleConfig: any) => {
    setStatus("compiling");
    setErrorMsg(null);

    try {
      // 1. Parse JSON input
      const data = JSON.parse(currentJsonText);

      // Normalize arrays that Nunjucks filters expect
      if (data.skills) {
        if (typeof data.skills === 'object' && !Array.isArray(data.skills)) {
          data.skills = Object.keys(data.skills).map(category => ({
            category,
            items: Array.isArray(data.skills[category]) ? data.skills[category] : (typeof data.skills[category] === 'string' ? data.skills[category].split(',').map((s: string) => s.trim()) : [data.skills[category]])
          }));
        } else if (Array.isArray(data.skills)) {
          data.skills = data.skills.map((s: any) => ({ ...s, items: Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? s.items.split(',').map((x: string) => x.trim()) : []) }));
        }
      }
      if (data.projects && Array.isArray(data.projects)) {
        data.projects = data.projects.map((p: any) => ({ ...p, description: Array.isArray(p.description) ? p.description : (typeof p.description === 'string' ? [p.description] : []) }));
      }
      if (data.education && Array.isArray(data.education)) {
        data.education = data.education.map((e: any) => {
          const cw = e["Relevant coursework"];
          return { ...e, "Relevant coursework": Array.isArray(cw) ? cw : (typeof cw === 'string' ? cw.split(',').map((x: string) => x.trim()) : undefined) };
        });
      }

      // Pre-process extra protected terms into an array before sending
      const finalStyleConfig = {
        ...currentStyleConfig,
        extra_protected_terms: currentStyleConfig.extra_protected_terms
          ? currentStyleConfig.extra_protected_terms.split(",").map((t: string) => t.trim()).filter(Boolean)
          : []
      };

      // 2. Send via IPC to Electron Main Process
      const electronAPI = getElectronAPI();
      const result = await electronAPI.generatePdf(data, currentTemplate, finalStyleConfig);

      if (result.success) {
        const newUrl = `${result.pdfPath}?t=${Date.now()}#zoom=100&navpanes=0&pagemode=none`;
        setPdfUrl(newUrl);
        setLastPdfUrl(newUrl);
        setStatus("done");
      } else if (result.canceled) {
        // Silently ignore canceled compilations (since it implies a new one just started)
        console.log("Previous compilation canceled smoothly.");
      } else {
        setErrorMsg(parseLatexError(result.error || ""));
        setStatus("error");
      }
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        setErrorMsg("Invalid JSON: " + e.message);
      } else {
        setErrorMsg((e as Error).message);
      }
      setStatus("error");
    }
  };

  const debouncedCompile = useRef(
    debounce((json: string, template: string, style: any) => {
      compileResume(json, template, style);
    }, 1000)
  ).current;

  // Auto-compile removed as per user request to avoid unprompted PDF generation
  // useEffect(() => {
  //   debouncedCompile(jsonText, templateName, styleConfig);
  // }, [jsonText, templateName, styleConfig]);

  const handleCompile = useCallback(() => {
    debouncedCompile.cancel();
    compileResume(jsonText, templateName, styleConfig);
  }, [jsonText, templateName, styleConfig]);


  const handleOpenJson = async () => {
    const electronAPI = getElectronAPI();
    const result = await electronAPI.openJson();
    if (result.success && result.data) {
      setJsonText(result.data);
    }
  };

  const handleSaveJson = async () => {
    const electronAPI = getElectronAPI();
    await electronAPI.saveJson(jsonText);
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#1c1c1e] overflow-hidden">

      {/* LEFT PANE - Editor */}
      <div className="w-1/2 flex flex-col border-r border-[#c7cad5] bg-[#ffffff] relative">
        <div className="h-10 bg-white border-b border-[#e9eaef] flex items-center px-4 justify-between select-none">
          <div className="flex gap-1 bg-[#e9eaef] ring-shadow-border p-1 rounded">
            <button
              onClick={() => setViewMode("form")}
              className={`flex items-center gap-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${viewMode === 'form' ? 'bg-white text-[#5b76fe] border border-[#c7cad5] ring-[1px] ring-[rgb(224,226,232)] px-2 py-1' : 'text-[#555a6a] hover:text-[#1c1c1e] px-2 py-1'}`}
            >
              <ListTree className="w-3.5 h-3.5" /> Form
            </button>
            <button
              onClick={() => setViewMode("json")}
              className={`flex items-center gap-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${viewMode === 'json' ? 'bg-white text-[#5b76fe] border border-[#c7cad5] ring-[1px] ring-[rgb(224,226,232)] px-2 py-1' : 'text-[#555a6a] hover:text-[#1c1c1e] px-2 py-1'}`}
            >
              <Code2 className="w-3.5 h-3.5" /> JSON
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenJson}
              className="flex items-center gap-1.5 bg-transparent border border-[#c7cad5] hover:bg-[#c7cad5]/50 rounded-[8px] text-[11px] text-[#1c1c1e] px-[12px] py-[7px] transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3 h-3" /> OPEN
            </button>
            <button
              onClick={handleSaveJson}
              className="flex items-center gap-1.5 bg-transparent border border-[#c7cad5] hover:bg-[#c7cad5]/50 rounded-[8px] text-[11px] text-[#1c1c1e] px-[12px] py-[7px] transition-colors cursor-pointer"
            >
              <Save className="w-3 h-3" /> SAVE
            </button>
            <div className="w-px h-4 bg-[#e9eaef] mx-1"></div>

            <button
              ref={tweaksBtnRef}
              onClick={() => setShowTweaks(!showTweaks)}
              className="flex items-center gap-2 border border-[#c7cad5] bg-[#e9eaef]/30 hover:bg-[#e9eaef] rounded-[8px] text-[11px] font-semibold text-[#1c1c1e] px-[12px] py-[7px] transition-colors cursor-pointer"
            >
              <Settings2 className="w-3 h-3" />
              TWEAKS
            </button>
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="flex items-center gap-2 bg-[#5b76fe] hover:bg-[#2a41b6] disabled:bg-[#e9eaef] disabled:text-[#a5a8b5] rounded-[8px] text-[11px] font-semibold text-[#ffffff] px-[12px] py-[7px] transition-colors cursor-pointer ring-shadow-border"
            >
              {isCompiling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              {isCompiling ? "COMPILING" : "COMPILE"}
            </button>
          </div>
        </div>

        {/* Tweaks Panel */}
        {showTweaks && (
          <div ref={tweaksPanelRef} className="absolute top-12 left-4 right-4 z-20 bg-white ring-shadow-border border border-[#e9eaef] rounded-[24px] p-8 flex flex-col gap-8 animate-in slide-in-from-top-2 select-none overflow-y-auto max-h-[80vh]">



            {/* ROW 1: General Styling */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-[#555a6a] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fde0f0]"></span>
                Style
              </div>
              <div className="flex flex-wrap items-center gap-5 bg-[#fde0f0]/30 ring-shadow-border p-4 rounded-[16px]">

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                  Template:
                  <select
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="bg-white border border-[#e9eaef] focus:border-blue-450 focus:ring-1 focus:ring-blue-450 outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs cursor-pointer min-w-[120px]"
                  >
                    <option value="classic.tex">classic.tex</option>
                    <option value="experiment.tex">experiment.tex</option>
                  </select>
                </label>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                  Font:
                  <select
                    name="font"
                    value={styleConfig.font}
                    onChange={handleStyleChange}
                    className="bg-white border border-[#e9eaef] focus:border-blue-450 focus:ring-1 focus:ring-blue-450 outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs cursor-pointer min-w-[120px]"
                  >
                    <option value="Calibri">Calibri</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Garamond">Garamond</option>
                    <option value="Palatino Linotype">Palatino</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                  Size:
                  <div className="flex items-center gap-2">
                    <input type="range" min="8" max="16" step="0.5" name="font_size" value={styleConfig.font_size} onChange={handleStyleChange} className="w-24 accent-[#5b76fe]" />
                    <span className="text-[#5b76fe] w-6 font-mono text-[10px]">{styleConfig.font_size}</span>
                  </div>
                </label>
                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                  Colour:
                  <input
                    type="color"
                    name="section_color"
                    value={rgbToHex(styleConfig.section_color as number[])}
                    onChange={(e) => handleStyleChange({ target: { name: 'section_color', value: hexToRgb(e.target.value), type: 'color' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
                    className="w-8 h-8 rounded-[8px] cursor-pointer border-0 p-0 bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[8px]"
                  />
                </label>
              </div>
            </div>

            {/* ROW 2: Layout */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-[#555a6a] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b76fe]"></span>
                Layout
              </div>
              <div className="flex flex-wrap items-center gap-5 bg-[#c3faf5]/30 ring-shadow-border p-4 rounded-[16px]">

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#555a6a]">Margins:</span>
                  <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    TB:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="1.5" step="0.1" name="margin_tb" value={styleConfig.margin_tb} onChange={handleStyleChange} className="w-20 accent-[#5b76fe]" />
                      <span className="text-[#5b76fe] w-4 font-mono text-[10px]">{styleConfig.margin_tb}</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    LR:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="1.5" step="0.1" name="margin_lr" value={styleConfig.margin_lr} onChange={handleStyleChange} className="w-20 accent-[#5b76fe]" />
                      <span className="text-[#5b76fe] w-4 font-mono text-[10px]">{styleConfig.margin_lr}</span>
                    </div>
                  </label>
                </div>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#555a6a]">Gaps:</span>
                  <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Section:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="25" step="1" name="section_spacing" value={styleConfig.section_spacing} onChange={handleStyleChange} className="w-20 accent-[#5b76fe]" />
                      <span className="text-[#5b76fe] w-4 font-mono text-[10px]">{styleConfig.section_spacing}</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                    Entry:
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="20" step="1" name="entry_spacing" value={styleConfig.entry_spacing} onChange={handleStyleChange} className="w-20 accent-[#5b76fe]" />
                      <span className="text-[#5b76fe] w-4 font-mono text-[10px]">{styleConfig.entry_spacing}</span>
                    </div>
                  </label>
                </div>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                  Line Spacing:
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="10" step="0.5" name="item_spacing" value={styleConfig.item_spacing} onChange={handleStyleChange} className="w-20 accent-[#5b76fe]" />
                    <span className="text-[#5b76fe] w-6 font-mono text-[10px]">{styleConfig.item_spacing}</span>
                  </div>
                </label>

              </div>
            </div>

            {/* ROW 3: Details */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-[#555a6a] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffe6cd]"></span>
                Details
              </div>
              <div className="flex flex-wrap items-center gap-5 bg-[#ffe6cd]/30 ring-shadow-border p-4 rounded-[16px]">

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                  Bullet:
                  <select
                    name="bullet"
                    value={styleConfig.bullet}
                    onChange={handleStyleChange}
                    className="bg-white border border-[#e9eaef] focus:border-blue-450 focus:ring-1 focus:ring-blue-450 outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs cursor-pointer min-w-[100px] font-mono"
                  >
                    <option value="$\bullet$">• bullet</option>
                    <option value="$\circ$">○ circ</option>
                    <option value="-">- dash</option>
                    <option value="$\ast$">∗ ast</option>
                    <option value="$\cdot$">· cdot</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium">
                  Indent:
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="5" step="0.1" name="bullet_indent" value={styleConfig.bullet_indent} onChange={handleStyleChange} className="w-16 accent-[#5b76fe]" />
                    <span className="text-[#5b76fe] w-6 font-mono text-[10px]">{styleConfig.bullet_indent}</span>
                  </div>
                </label>
                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium cursor-pointer hover:text-[#1c1c1e] transition-colors">
                  <input type="checkbox" name="use_icons" checked={styleConfig.use_icons} onChange={handleStyleChange} className="w-4 h-4 rounded-[4px] bg-white ring-shadow-border border border-[#e9eaef] text-[#5b76fe] focus:ring-blue-450 focus:ring-1 cursor-pointer" />
                  Icons (fa5)
                </label>

                <div className="w-px h-4 bg-[#c7cad5]"></div>

                <label className="flex items-center gap-2 text-xs text-[#555a6a] font-medium flex-1 min-w-[200px]">
                  Protect:
                  <input type="text" name="extra_protected_terms" placeholder="e.g. React, AWS" value={styleConfig.extra_protected_terms} onChange={handleStyleChange} className="bg-white border border-[#e9eaef] focus:border-blue-450 focus:ring-1 focus:ring-blue-450 outline-none rounded-[8px] px-[16px] py-[8px] text-[#1c1c1e] text-xs w-full placeholder:text-[#a5a8b5]" />
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
              theme="light"
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
          <div className="flex-1 min-h-0 flex flex-col bg-white">
            {/* Form Editor Wrapper */}
            <FormEditor jsonText={jsonText} onChange={(newJson) => setJsonText(newJson)} />
          </div>
        )}

        {errorMsg && (
          <div className="absolute bottom-0 left-0 w-full bg-[#fbd4d4] text-[#600000] p-4 text-xs border-t border-[#e3c5c5] z-10">
            <p className="font-bold flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Compilation Error
            </p>
            <pre className="whitespace-pre-wrap font-mono mt-2 opacity-80">{errorMsg}</pre>
          </div>
        )}
      </div>

      {/* RIGHT PANE - PDF Preview */}
      <div className="w-1/2 flex flex-col bg-[#c7cad5] relative">
        <div className="h-10 bg-white border-b border-[#e9eaef] flex items-center px-4 justify-between select-none">
          <div className="text-xs font-semibold text-[#555a6a] tracking-wider">PDF PREVIEW</div>
          <button
            onClick={() => {
              if (pdfUrl) {
                const electronAPI = getElectronAPI();
                electronAPI.savePdf(pdfUrl);
              }
            }}
            disabled={!pdfUrl}
            className={`flex items-center gap-1.5 transition-colors ${pdfUrl ? 'text-[#555a6a] hover:text-[#1c1c1e] cursor-pointer' : 'text-[#a5a8b5] cursor-not-allowed'}`}
            title="Download PDF"
          >
            <FileDown className="w-3 h-3" />
            <span className="text-xs uppercase">Download</span>
          </button>
        </div>

        <div className="flex-1 bg-[#e9eaef] flex justify-center w-full h-full relative ">
          {pdfUrl || lastPdfUrl ? (
            <iframe
              src={pdfUrl || lastPdfUrl || undefined}
              className="w-full h-full border-none m-0 p-0"
              title="PDF Preview"
            />
          ) : (
            <div className="m-auto flex flex-col items-center justify-center text-[#555a6a] gap-3 opacity-50 relative z-0">
              <FileDown className="w-12 h-12" />
              <div className="text-sm">No PDF Generated</div>
              <div className="text-xs text-[#555a6a]">Edit form or JSON to generate</div>
            </div>
          )}

          {isCompiling && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-sm z-10 transition-all duration-300">
              <div className="bg-white border border-[#e9eaef] px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#5b76fe]" />
                <span className="text-sm font-bold tracking-widest text-[#555a6a] uppercase animate-pulse">
                  Compiling PDF...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;
