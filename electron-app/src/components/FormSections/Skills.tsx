import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field } from "./SharedComponents";

interface Props {
    data: any;
    updateField: any;
    moveItem: any;
    deleteItem: any;
    addItem: any;
}

export function Skills({ data, updateField, moveItem, deleteItem, addItem }: Props) {
    return (
        <>
            {Array.isArray(data.skills) && data.skills.map((skill: any, i: number) => (
                <div key={i} className="mb-4 p-5 border border-[#c7cad5] bg-[#f4f5f7] rounded-xl relative group flex flex-col gap-4 transition-all hover:border-[#e9eaef]">
                    <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button title="Move Up" onClick={() => moveItem(["skills"], i, 'up')} disabled={i === 0} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                        <button title="Move Down" onClick={() => moveItem(["skills"], i, 'down')} disabled={i === (data.skills?.length || 1) - 1} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => deleteItem(["skills"], i)} className="text-[#1c1c1e] hover:text-[#600000] hover:bg-[#fbd4d4] p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    <div className="pr-28">
                        <Field label="Category" value={skill.category || ""} onChange={(v) => updateField(["skills", i, "category"], v)} placeholder="e.g. Languages" />
                    </div>
                    <div className="pr-24 cursor-text">
                        <Field label="Items (Comma separated)" value={[].concat(skill.items || []).join(", ")} onChange={(v) => updateField(["skills", i, "items"], v.split(",").map((x: string) => x.trim()).filter((x: string) => x))} placeholder="Python, JavaScript, C++" />
                    </div>
                </div>
            ))}
            <button onClick={() => addItem(["skills"], { category: "", items: [] })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-[#c7cad5] text-[#1c1c1e] hover:text-[#5b76fe] hover:border-[#5b76fe] hover:bg-[#f4f5f7] rounded-[12px] transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Skill Category</button>
        </>
    );
}
