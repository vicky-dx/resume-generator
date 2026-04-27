import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import React, { useState } from "react";

interface ThemeProps {
    bg: string;
    text: string;
    border: string;
}

export function SortableSectionItem({ id, title, children, theme }: { id: string, title: string, children: React.ReactNode, theme?: ThemeProps }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const [open, setOpen] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 10 : 1,
        position: 'relative' as any,
    };

    // Default to a soft gray if no theme provided
    const safeTheme = theme || { bg: 'bg-[#f4f5f7]', text: 'text-[#1c1c1e]', border: 'border-[#e9eaef]' };

    return (
        <div ref={setNodeRef} {...{ style }} className={`mb-6 bg-white ring-shadow-border rounded-[20px] transition-shadow ${isDragging ? 'shadow-2xl cursor-grabbing' : ''}`}>
            <div className={`w-full flex items-center justify-between p-4 ${safeTheme.bg} transition-colors border-b ${open ? safeTheme.border : 'border-transparent'} rounded-t-[20px] ${!open ? 'rounded-b-[20px]' : ''}`}>
                <div className="flex items-center gap-3 w-full">
                    {/* DRAG HANDLE */}
                    <div {...attributes} {...listeners} className={`bg-white/50 hover:bg-white p-1.5 rounded-[8px] ${safeTheme.text} shadow-sm border border-white/40 cursor-grab active:cursor-grabbing transition-colors touch-none`}>
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <button onClick={() => setOpen(!open)} className={`outline-none text-left flex-1 font-display text-[22px] ${safeTheme.text} tracking-[-0.72px] select-none`}>
                        {title}
                    </button>
                </div>
                <button onClick={() => setOpen(!open)} className={`p-1.5 rounded-full hover:bg-white/40 transition-colors ${safeTheme.text}`}>
                    {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>
            {open && (
                <div className="p-6 cursor-default border-t border-[#e9eaef]/50 bg-white rounded-b-[20px]">
                    {children}
                </div>
            )}
        </div>
    );
}
