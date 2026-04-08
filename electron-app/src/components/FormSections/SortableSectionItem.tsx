import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import React, { useState } from "react";

export function SortableSectionItem({ id, title, children }: { id: string, title: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const [open, setOpen] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : 1,
        position: 'relative' as any,
    };

    return (
        <div ref={setNodeRef} {...{ style }} className="mb-6 bg-[#0E0E10] border border-neutral-800/80 rounded-2xl shadow-sm">
            <div className={`w-full flex items-center justify-between p-4 bg-[#141415] transition-colors border-b rounded-t-2xl ${open ? 'border-neutral-800' : 'border-transparent'}`}>
                <div className="flex items-center gap-3 w-full">
                    {/* DRAG HANDLE */}
                    <div {...attributes} {...listeners} className="bg-neutral-800/50 hover:bg-neutral-700 hover:text-white p-1.5 rounded-md text-neutral-400 shadow-sm border border-neutral-700/50 cursor-grab transition-colors touch-none">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <button onClick={() => setOpen(!open)} className="outline-none text-left flex-1 font-semibold text-neutral-200 tracking-wide select-none">
                        {title}
                    </button>
                </div>
                <button onClick={() => setOpen(!open)} className="text-neutral-500">
                    {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>
            {open && (
                <div className="p-6 cursor-default border-t border-neutral-800/50">
                    {children}
                </div>
            )}
        </div>
    );
}
