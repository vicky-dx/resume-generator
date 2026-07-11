import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field, RichTextArea } from "./SharedComponents";

interface Props {
    data: any;
    updateField: any;
    moveItem: any;
    deleteItem: any;
    addItem: any;
    errors?: Record<string, string>;
}

export function Experience({ data, updateField, moveItem, deleteItem, addItem, errors }: Props) {
    return (
        <>
            {Array.isArray(data.experience) && data.experience.map((exp: any, i: number) => (
                <div key={i} className="mb-6 p-5 border border-[#c7cad5] bg-white rounded-[12px] relative group transition-all">
                    <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button title="Move Up" onClick={() => moveItem(["experience"], i, 'up')} disabled={i === 0} className="hover:text-[#5b76fe] disabled:opacity-20 p-1 cursor-pointer"><ArrowUp className="w-4 h-4" /></button>
                        <button title="Move Down" onClick={() => moveItem(["experience"], i, 'down')} disabled={i === (data.experience?.length || 1) - 1} className="hover:text-[#5b76fe] disabled:opacity-20 p-1 cursor-pointer"><ArrowDown className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => deleteItem(["experience"], i)} className="text-[#1c1c1e] hover:text-[#600000] hover:bg-[#fbd4d4] p-1.5 rounded ml-2 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-5 pr-28">
                        <Field label="Company" value={exp.company || ""} onChange={(v) => updateField(["experience", i, "company"], v)} error={errors?.[`experience.${i}.company`]} />
                        <Field label="Position" value={exp.position || ""} onChange={(v) => updateField(["experience", i, "position"], v)} error={errors?.[`experience.${i}.position`]} />
                        <Field label="Work Type" value={exp.work_type || ""} onChange={(v) => updateField(["experience", i, "work_type"], v)} error={errors?.[`experience.${i}.work_type`]} placeholder="e.g. Full-time, Remote, Hybrid" />
                        <Field label="Location" value={exp.location || ""} onChange={(v) => updateField(["experience", i, "location"], v)} error={errors?.[`experience.${i}.location`]} />
                        <Field label="Duration" value={exp.duration || ""} onChange={(v) => updateField(["experience", i, "duration"], v)} error={errors?.[`experience.${i}.duration`]} />
                    </div>
                    <div className="text-xs font-semibold text-[#a5a8b5] uppercase tracking-widest mb-3">Achievements (One per line)</div>
                    <RichTextArea rows={5} value={[].concat(exp.achievements || []).join("\n")} onChange={(v) => updateField(["experience", i, "achievements"], v.split("\n"))} error={errors?.[`experience.${i}.achievements`]} placeholder="- Engineered highly scalable microservices..." />
                </div>
            ))}
            <button onClick={() => addItem(["experience"], { company: "", position: "", duration: "", work_type: "", location: "", achievements: [] })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-[#c7cad5] text-[#1c1c1e] hover:text-[#5b76fe] hover:border-[#5b76fe] bg-transparent hover:bg-white rounded-[12px] transition-all font-medium cursor-pointer"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Experience</button>
        </>
    );
}
