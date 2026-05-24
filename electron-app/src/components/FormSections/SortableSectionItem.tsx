import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from "lucide-react";
import React, { useState } from "react";

interface ThemeProps {
    bg: string;
    text: string;
    border: string;
}

export function SortableSectionItem({ id, title, children, theme, onDelete }: { id: string, title: string, children: React.ReactNode, theme?: ThemeProps, onDelete?: () => void }) {
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
    const safeTheme = theme || { bg: 'bg-white', text: 'text-[#1c1c1e]', border: 'border-[#c7cad5]' };

    return (
        <div ref={setNodeRef} {...{ style }} className={`mb-6 bg-white ring-shadow-border rounded-[20px] transition-shadow ${isDragging ? 'ring-[2px] ring-[rgb(224,226,232)] cursor-grabbing' : ''}`}>
            <div className={`w-full flex items-center justify-between p-4 ${safeTheme.bg} transition-colors border-b ${open ? safeTheme.border : 'border-transparent'} rounded-t-[20px] ${!open ? 'rounded-b-[20px]' : ''}`}>
                <div className="flex items-center gap-3 w-full">
                    {/* DRAG HANDLE */}
                    <div {...attributes} {...listeners} className={`bg-white hover:bg-white p-1.5 rounded-[8px] ${safeTheme.text} ring-[1px] ring-[rgb(224,226,232)] border border-[#c7cad5] cursor-grab active:cursor-grabbing transition-colors touch-none`}>
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <button onClick={() => setOpen(!open)} className={`outline-none text-left flex-1 font-display text-[22px] ${safeTheme.text} tracking-[-0.72px] select-none`}>
                        {title}
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1.5 rounded-full hover:bg-white transition-colors text-red-500 hover:text-red-700 cursor-pointer"
                            title={`Delete ${title} section`}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={() => setOpen(!open)} className={`p-1.5 rounded-full hover:bg-white transition-colors ${safeTheme.text}`}>
                        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            {open && (
                <div className="p-6 cursor-default border-t border-[#e9eaef]/50 bg-white rounded-b-[20px]">
                    {children}
                </div>
            )}
        </div>
    );
}
