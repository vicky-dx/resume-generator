import { Bold, Italic } from "lucide-react";
import { useRef } from "react";

export function Field({ label, value, onChange, placeholder, disabled, error }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, disabled?: boolean, error?: string }) {
    return (
        <div className={`relative flex flex-col group pt-2.5 ${disabled ? 'opacity-50' : ''}`}>
            <label className={`text-[10px] font-bold uppercase tracking-wider transition-colors bg-white inline-block w-max px-1.5 absolute top-0 left-3 z-10 ${
                error ? 'text-red-500 group-focus-within:text-red-500 bg-white' : 'text-[#a5a8b5] group-focus-within:text-[#5b76fe] bg-white'
            }`}>{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full bg-white border text-[#1c1c1e] text-sm rounded-[8px] p-[16px] outline-none transition-all font-medium placeholder:text-[#a5a8b5] disabled:cursor-not-allowed disabled:bg-[#f8f9fa] ${
                    error 
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                        : 'border-[#c7cad5] focus:border-[#5b76fe] focus:ring-1 focus:ring-[#5b76fe]'
                }`}
            />
            {error && (
                <span className="text-[10px] text-red-500 mt-1 ml-2 font-medium">
                    {error}
                </span>
            )}
        </div>
    );
}

export function RichTextArea({ value, onChange, placeholder, rows = 4, error }: { value: string, onChange: (v: string) => void, placeholder?: string, rows?: number, error?: string }) {
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
        <div className={`border rounded-[8px] overflow-hidden bg-white transition-colors ring-[0px] ${
            error 
                ? 'border-red-500 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500' 
                : 'border-[#c7cad5] focus-within:border-[#5b76fe] focus-within:ring-1 focus-within:ring-[#5b76fe]'
        }`}>
            <div className={`flex items-center gap-1 border-b bg-white p-2 ${error ? 'border-red-500/35' : 'border-[#c7cad5]'}`}>
                <button
                    onClick={() => applyStyling("**", "**")}
                    className="p-1.5 text-[#a5a8b5] hover:text-[#5b76fe] hover:bg-[#c7cad5]/50 rounded-[8px] transition-colors"
                    title="Bold (**text**)"
                >
                    <Bold className="w-[14px] h-[14px]" />
                </button>
                <button
                    onClick={() => applyStyling("*", "*")}
                    className="p-1.5 text-[#a5a8b5] hover:text-[#5b76fe] hover:bg-[#c7cad5]/50 rounded-[8px] transition-colors"
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
            {error && (
                <div className="text-[10px] text-red-500 px-4 py-2 border-t border-red-500/10 font-medium bg-red-50/20">
                    {error}
                </div>
            )}
        </div>
    );
}
