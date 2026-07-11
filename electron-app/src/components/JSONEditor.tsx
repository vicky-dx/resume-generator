import Editor from "@monaco-editor/react";

interface JSONEditorProps {
    value: string;
    onChange: (val: string) => void;
}

export default function JSONEditor({ value, onChange }: JSONEditorProps) {
    return (
        <div className="flex-1 min-h-0">
            <Editor
                height="100%"
                language="json"
                theme="light"
                value={value}
                onChange={(val) => onChange(val || "")}
                options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: "on",
                    formatOnPaste: true,
                    padding: { top: 16 }
                }}
            />
        </div>
    );
}
