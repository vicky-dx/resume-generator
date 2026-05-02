import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field } from "./SharedComponents";

interface Props {
    data: any;
    updateField: any;
    moveItem: any;
    deleteItem: any;
    addItem: any;
}

export function Awards({ data, updateField, moveItem, deleteItem, addItem }: Props) {
    return (
        <>
            {Array.isArray(data.awards) && data.awards.map((award: any, i: number) => (
                <div key={i} className="mb-4 p-5 border border-[#c7cad5] bg-white rounded-[12px] relative group transition-all">
                    <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button title="Move Up" onClick={() => moveItem(["awards"], i, 'up')} disabled={i === 0} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                        <button title="Move Down" onClick={() => moveItem(["awards"], i, 'down')} disabled={i === (data.awards?.length || 1) - 1} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => deleteItem(["awards"], i)} className="text-[#1c1c1e] hover:text-[#600000] hover:bg-[#fbd4d4] p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pr-28">
                        <Field label="Title / Name" value={award.title || ""} onChange={(v) => updateField(["awards", i, "title"], v)} />
                        <Field label="Issuer" value={award.issuer || ""} onChange={(v) => updateField(["awards", i, "issuer"], v)} />
                        <Field label="Description / Date" value={award.description || award.date || ""} onChange={(v) => updateField(["awards", i, "description"], v)} />
                    </div>
                </div>
            ))}
            <button onClick={() => addItem(["awards"], { title: "", issuer: "", description: "" })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-[#c7cad5] text-[#1c1c1e] hover:text-[#5b76fe] hover:border-[#5b76fe] bg-transparent hover:bg-white rounded-[12px] transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Award/Certificate</button>
        </>
    );
}
