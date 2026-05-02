import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field } from "./SharedComponents";

interface Props {
    data: any;
    updateField: any;
    moveItem: any;
    deleteItem: any;
    addItem: any;
}

export function Education({ data, updateField, moveItem, deleteItem, addItem }: Props) {
    return (
        <>
            {Array.isArray(data.education) && data.education.map((edu: any, i: number) => (
                <div key={i} className="mb-5 p-5 border border-[#c7cad5] bg-white rounded-[12px] relative group transition-all">
                    <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button title="Move Up" onClick={() => moveItem(["education"], i, 'up')} disabled={i === 0} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                        <button title="Move Down" onClick={() => moveItem(["education"], i, 'down')} disabled={i === (data.education?.length || 1) - 1} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => deleteItem(["education"], i)} className="text-[#1c1c1e] hover:text-[#600000] hover:bg-[#fbd4d4] p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pr-28">
                        <Field label="Degree / Course" value={edu.degree || ""} onChange={(v) => updateField(["education", i, "degree"], v)} />
                        <Field label="Institution" value={edu.institution || ""} onChange={(v) => updateField(["education", i, "institution"], v)} />
                        <Field label="Duration" value={edu.duration || ""} onChange={(v) => updateField(["education", i, "duration"], v)} />
                        <Field label="Score / GPA" value={edu.gpa || edu.score || ""} onChange={(v) => updateField(["education", i, "gpa"], v)} />
                    </div>
                </div>
            ))}
            <button onClick={() => addItem(["education"], { degree: "", institution: "", duration: "", gpa: "" })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-[#c7cad5] text-[#1c1c1e] hover:text-[#5b76fe] hover:border-[#5b76fe] bg-transparent hover:bg-white rounded-[12px] transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Education</button>
        </>
    );
}
