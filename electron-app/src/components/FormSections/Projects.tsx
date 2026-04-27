import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field, RichTextArea } from "./SharedComponents";

interface Props {
    data: any;
    updateField: any;
    moveItem: any;
    deleteItem: any;
    addItem: any;
}

export function Projects({ data, updateField, moveItem, deleteItem, addItem }: Props) {
    return (
        <>
            {Array.isArray(data.projects) && data.projects.map((proj: any, i: number) => (
                <div key={i} className="mb-6 p-5 border border-[#c7cad5] bg-[#f4f5f7] rounded-xl relative group transition-all hover:border-[#e9eaef]">
                    <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button title="Move Up" onClick={() => moveItem(["projects"], i, 'up')} disabled={i === 0} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                        <button title="Move Down" onClick={() => moveItem(["projects"], i, 'down')} disabled={i === (data.projects?.length || 1) - 1} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => deleteItem(["projects"], i)} className="text-[#1c1c1e] hover:text-[#600000] hover:bg-[#fbd4d4] p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-5 pr-28">
                        <Field label="Project Name" value={proj.name || proj.title || ""} onChange={(v) => updateField(["projects", i, "name"], v)} />
                        <Field label="Technologies Used" value={proj.technologies || proj.tech_stack || ""} onChange={(v) => updateField(["projects", i, "technologies"], v)} placeholder="e.g. React, Node.js, Vercel" />
                        <Field label="Date/Year" value={proj.year || proj.date || ""} onChange={(v) => updateField(["projects", i, "year"], v)} placeholder="e.g. 2026" />
                    </div>
                    <div className="text-xs font-semibold text-[#a5a8b5] uppercase tracking-widest mb-3">Description / Highlights (One per line)</div>
                    <RichTextArea rows={5} value={[].concat(proj.description || proj.highlights || []).join("\n")} onChange={(v) => updateField(["projects", i, "description"], v.split("\n"))} placeholder="- Built user interface using..." />
                </div>
            ))}
            <button onClick={() => addItem(["projects"], { name: "", technologies: "", year: "", description: [] })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-[#c7cad5] text-[#1c1c1e] hover:text-[#5b76fe] hover:border-[#5b76fe] hover:bg-[#f4f5f7] rounded-[12px] transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Project</button>
        </>
    );
}
