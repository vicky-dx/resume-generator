import { Bold, Italic } from "lucide-react";
import { useRef } from "react";

export function Field({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    return (
        <div className="flex flex-col gap-1.5 focus-within:text-blue-400 group">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 group-focus-within:text-blue-400 transition-colors bg-[#141415] inline-block w-max rounded px-1 absolute -mt-2 ml-2 z-10">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#0A0A0B] border border-neutral-800 text-neutral-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-[#0A0A0B]/80 transition-all font-medium placeholder:text-neutral-700/50"
            />
        </div>
    );
}

export function RichTextArea({ value, onChange, placeholder, rows = 4 }: { value: string, onChange: (v: string) => void, placeholder?: string, rows?: number }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const applyStyling = (wrapperStart: string, wrapperEnd: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const beforeSelection = value.substring(0, start);
        const afterSelection = value.substring(end);
        let newValue;

        if (beforeSelection.endsWith(wrapperStart) && afterSelection.startsWith(wrapperEnd)) {
            newValue = beforeSelection.slice(0, -wrapperStart.length) + selectedText + afterSelection.slice(wrapperEnd.length);
        } else {
            const replacement = wrapperStart + selectedText + wrapperEnd;
            newValue = beforeSelection + replacement + afterSelection;
        }

        onChange(newValue);
        setTimeout(() => {
            textarea.focus();
            if (textareaRef.current) {
                const newCursorPos = beforeSelection.endsWith(wrapperStart)
                    ? start - wrapperStart.length
                    : start + wrapperStart.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
            }
        }, 10);
    };

    return (
        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-[#0A0A0B] focus-within:border-blue-500 transition-colors">
            <div className="flex items-center gap-1 border-b border-neutral-800 bg-[#141415] p-1.5">
                <button
                    onClick={() => applyStyling("**", "**")}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                    title="Bold (**text**)"
                >
                    <Bold className="w-[14px] h-[14px]" />
                </button>
                <button
                    onClick={() => applyStyling("*", "*")}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                    title="Italic (*text*)"
                >
                    <Italic className="w-[14px] h-[14px]" />
                </button>
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-transparent text-neutral-200 text-sm p-3 outline-none resize-y font-medium placeholder:text-neutral-700/50 leading-relaxed"
            />
        </div>
    );
}
