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
                <div key={i} className="mb-4 p-5 border border-neutral-800 bg-[#141415] rounded-xl relative group transition-all hover:border-neutral-700">
                    <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button title="Move Up" onClick={() => moveItem(["awards"], i, 'up')} disabled={i === 0} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                        <button title="Move Down" onClick={() => moveItem(["awards"], i, 'down')} disabled={i === (data.awards?.length || 1) - 1} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => deleteItem(["awards"], i)} className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pr-28">
                        <Field label="Title / Name" value={award.title || ""} onChange={(v) => updateField(["awards", i, "title"], v)} />
                        <Field label="Issuer" value={award.issuer || ""} onChange={(v) => updateField(["awards", i, "issuer"], v)} />
                        <Field label="Description / Date" value={award.description || award.date || ""} onChange={(v) => updateField(["awards", i, "description"], v)} />
                    </div>
                </div>
            ))}
            <button onClick={() => addItem(["awards"], { title: "", issuer: "", description: "" })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-neutral-800 text-neutral-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Award/Certificate</button>
        </>
    );
}
