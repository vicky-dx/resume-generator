import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Field } from "./SharedComponents";

interface Props {
    data: any;
    updateField: any;
    moveItem: any;
    deleteItem: any;
    addItem: any;
}

interface SkillItemInputProps {
    items: string[];
    onChange: (items: string[]) => void;
}

function SkillItemInput({ items, onChange }: SkillItemInputProps) {
    const [inputValue, setInputValue] = useState("");

    // Keep the input value in sync with external state changes, but only if they differ semantically
    useEffect(() => {
        const itemsArray = Array.isArray(items) ? items : [];
        const joined = itemsArray.join(", ");
        const currentParsed = inputValue.split(",").map(x => x.trim()).filter(Boolean);
        const externalParsed = itemsArray.map(x => (typeof x === 'string' ? (x as string).trim() : "")).filter(Boolean);
        if (JSON.stringify(currentParsed) !== JSON.stringify(externalParsed)) {
            setInputValue(joined);
        }
    }, [items]);

    const handleChange = (val: string) => {
        setInputValue(val);
        const parsed = val.split(",").map(x => x.trim()).filter(Boolean);
        onChange(parsed);
    };

    return (
        <Field
            label="Items (Comma separated)"
            value={inputValue}
            onChange={handleChange}
            placeholder="Python, JavaScript, C++"
        />
    );
}

export function Skills({ data, updateField, moveItem, deleteItem, addItem }: Props) {
    return (
        <>
            {Array.isArray(data.skills) && data.skills.map((skill: any, i: number) => (
                <div key={i} className="mb-4 p-5 border border-[#c7cad5] bg-white rounded-[12px] relative group flex flex-col gap-4 transition-all">
                    <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button title="Move Up" onClick={() => moveItem(["skills"], i, 'up')} disabled={i === 0} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                        <button title="Move Down" onClick={() => moveItem(["skills"], i, 'down')} disabled={i === (data.skills?.length || 1) - 1} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => deleteItem(["skills"], i)} className="text-[#1c1c1e] hover:text-[#600000] hover:bg-[#fbd4d4] p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    <div className="pr-28">
                        <Field label="Category" value={skill.category || ""} onChange={(v) => updateField(["skills", i, "category"], v)} placeholder="e.g. Languages" />
                    </div>
                    <div className="pr-24 cursor-text">
                        <SkillItemInput items={skill.items} onChange={(newItems) => updateField(["skills", i, "items"], newItems)} />
                    </div>
                </div>
            ))}
            <button onClick={() => addItem(["skills"], { category: "", items: [] })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-[#c7cad5] text-[#1c1c1e] hover:text-[#5b76fe] hover:border-[#5b76fe] bg-transparent hover:bg-white rounded-[12px] transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Skill Category</button>
        </>
    );
}
