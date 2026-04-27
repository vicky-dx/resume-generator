import { Bold, Italic } from "lucide-react";
import { useRef } from "react";

export function Field({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    return (
        <div className="relative flex flex-col focus-within:text-[#5b76fe] group pt-2.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#a5a8b5] group-focus-within:text-[#5b76fe] transition-colors bg-white inline-block w-max px-1.5 absolute top-0 left-3 z-10">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white border border-[#e9eaef] text-[#1c1c1e] text-sm rounded-[8px] p-[16px] outline-none focus:border-[#5b76fe] focus:ring-1 focus:ring-[#5b76fe] transition-all font-medium placeholder:text-[#a5a8b5]"
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
        <div className="border border-[#e9eaef] rounded-[8px] overflow-hidden bg-white focus-within:border-[#5b76fe] focus-within:ring-1 focus-within:ring-[#5b76fe] transition-colors ring-[0px]">
            <div className="flex items-center gap-1 border-b border-[#e9eaef] bg-white p-2">
                <button
                    onClick={() => applyStyling("**", "**")}
                    className="p-1.5 text-[#a5a8b5] hover:text-[#5b76fe] hover:bg-[#f4f5f7] rounded-[8px] transition-colors"
                    title="Bold (**text**)"
                >
                    <Bold className="w-[14px] h-[14px]" />
                </button>
                <button
                    onClick={() => applyStyling("*", "*")}
                    className="p-1.5 text-[#a5a8b5] hover:text-[#5b76fe] hover:bg-[#f4f5f7] rounded-[8px] transition-colors"
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
                className="w-full bg-transparent text-[#1c1c1e] text-sm p-[16px] outline-none resize-y font-medium placeholder:text-[#a5a8b5] leading-relaxed"
            />
        </div>
    );
}
