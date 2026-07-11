import { useState, useEffect } from "react";
import { AppLayout, EditorPane, PreviewPane } from "./layout";
import {
    Toolbar,
    JSONEditor,
    FormEditor,
    LatexWarningBanner,
    CompilationError,
    SettingsPanel,
    SetupWizard,
    UpdateBanner,
    ReleaseNotesModal
} from "./components";

import { useDocument, useCompiler, useLatex, useStyle, useUpdater } from "./hooks";
import { ElectronUpdateProvider } from "./providers/ElectronUpdateProvider";
import { MockUpdateProvider } from "./providers/MockUpdateProvider";

const updateProvider = process.env.NODE_ENV === "development"
    ? new MockUpdateProvider()
    : new ElectronUpdateProvider();

export default function App() {
    const style = useStyle();
    const document = useDocument();
    const compiler = useCompiler();
    const latex = useLatex();
    const updater = useUpdater(updateProvider);
    const [viewMode, setViewMode] = useState<"form" | "json">("form");
    const [showSettings, setShowSettings] = useState(false);
    const [releaseNotesInfo, setReleaseNotesInfo] = useState<{ version: string; notes: string } | null>(null);

    useEffect(() => {
        updater.initialize();
    }, []);

    useEffect(() => {
        const checkReleaseNotes = async () => {
            const pendingVersion = localStorage.getItem("pending_version");
            const pendingNotes = localStorage.getItem("pending_release_notes");

            if (pendingVersion) {
                try {
                    let currentVersion = "";
                    if (window.electronAPI) {
                        currentVersion = await window.electronAPI.getVersion();
                    }
                    const isDev = process.env.NODE_ENV === "development";
                    if (isDev || currentVersion === pendingVersion) {
                        setReleaseNotesInfo({
                            version: pendingVersion,
                            notes: pendingNotes || "• General stability improvements and bug fixes."
                        });
                    }
                } catch (e) {
                    console.error("Failed to check app version on startup:", e);
                } finally {
                    localStorage.removeItem("pending_version");
                    localStorage.removeItem("pending_release_notes");
                    localStorage.removeItem("mock_current_version");
                }
            } else {
                localStorage.removeItem("mock_current_version");
            }
        };

        checkReleaseNotes();
    }, []);

    const handleCompile = async () => {
        const result = await compiler.compile(document.jsonText, style.templateName, style.styleConfig);
        if (result && !result.success && result.error) {
            if (result.error.includes("latexmk not found") || result.error.includes("latexmk executable not found")) {
                latex.setIsSetupWizardOpen(true);
            }
        }
    };

    return (
        <AppLayout>
            <EditorPane>
                <Toolbar
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    isCompiling={compiler.isCompiling}
                    hasLatexIssues={latex.hasIssues}
                    onOpen={document.loadDocument}
                    onSave={document.saveDocument}
                    onCompile={handleCompile}
                    onToggleSettings={() => setShowSettings(!showSettings)}
                    onOpenSetup={() => latex.setIsSetupWizardOpen(true)}
                />

                <UpdateBanner
                    state={updater.state}
                    progress={updater.progress}
                    info={updater.info}
                    onInstall={updater.install}
                />

                {latex.hasIssues && (
                    <LatexWarningBanner onOpenSetup={() => latex.setIsSetupWizardOpen(true)} />
                )}

                {showSettings && (
                    <SettingsPanel
                        templateName={style.templateName}
                        setTemplateName={style.setTemplateName}
                        styleConfig={style.styleConfig}
                        onStyleChange={style.handleStyleChange}
                        onClose={() => setShowSettings(false)}
                    />
                )}

                {viewMode === "json" ? (
                    <JSONEditor value={document.jsonText} onChange={document.setJsonText} />
                ) : (
                    <FormEditor jsonText={document.jsonText} onChange={document.setJsonText} />
                )}

                {compiler.errorMsg && (
                    <CompilationError error={compiler.errorMsg} />
                )}
            </EditorPane>

            <PreviewPane
                pdfUrl={compiler.pdfUrl}
                lastPdfUrl={compiler.lastPdfUrl}
                isCompiling={compiler.isCompiling}
                onDownload={compiler.downloadPdf}
            />

            <SetupWizard
                isOpen={latex.isSetupWizardOpen}
                onClose={() => latex.setIsSetupWizardOpen(false)}
                status={latex.latexStatus}
                onRecheck={latex.checkDependencies}
            />

            <ReleaseNotesModal
                isOpen={!!releaseNotesInfo}
                onClose={() => setReleaseNotesInfo(null)}
                version={releaseNotesInfo?.version || ""}
                releaseNotes={releaseNotesInfo?.notes || ""}
            />
        </AppLayout>
    );
}
