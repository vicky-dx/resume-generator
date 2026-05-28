import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field } from "./SharedComponents";

interface Props {
    data: any;
    updateField: any;
    moveItem: any;
    deleteItem: any;
    addItem: any;
}

export function Languages({ data, updateField, moveItem, deleteItem, addItem }: Props) {
    const predefinedLevels = ["Native", "Fluent", "Intermediate", "Beginner"];

    return (
        <>
            {Array.isArray(data.languages) && data.languages.map((lang: any, i: number) => {
                const currentLevel = lang.level || "";
                const isCustom = !predefinedLevels.includes(currentLevel);
                const selectValue = isCustom ? "Custom" : (currentLevel || "Fluent");

                return (
                    <div key={i} className="mb-4 p-5 border border-[#c7cad5] bg-white rounded-[12px] relative group transition-all">
                        <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button title="Move Up" onClick={() => moveItem(["languages"], i, 'up')} disabled={i === 0} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                            <button title="Move Down" onClick={() => moveItem(["languages"], i, 'down')} disabled={i === (data.languages?.length || 1) - 1} className="hover:text-[#5b76fe] disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                            <button title="Delete" onClick={() => deleteItem(["languages"], i)} className="text-[#1c1c1e] hover:text-[#600000] hover:bg-[#fbd4d4] p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className={`grid gap-4 pr-28 items-end ${selectValue === "Custom" ? "grid-cols-3" : "grid-cols-2"}`}>
                            <Field label="Language" value={lang.name || ""} onChange={(v) => updateField(["languages", i, "name"], v)} placeholder="e.g. English, German, Hindi" />
                            
                            <div className="relative flex flex-col focus-within:text-[#5b76fe] group pt-2.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#a5a8b5] group-focus-within:text-[#5b76fe] transition-colors bg-white inline-block w-max px-1.5 absolute top-0 left-3 z-10">Proficiency</label>
                                <select
                                    value={selectValue}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "Custom") {
                                            updateField(["languages", i, "level"], "");
                                        } else {
                                            updateField(["languages", i, "level"], val);
                                        }
                                    }}
                                    className="w-full bg-white border border-[#c7cad5] text-[#1c1c1e] text-sm rounded-[8px] p-[16px] outline-none focus:border-[#5b76fe] focus:ring-1 focus:ring-[#5b76fe] transition-all font-medium appearance-none cursor-pointer placeholder:text-[#a5a8b5]"
                                >
                                    <option value="Native">Native</option>
                                    <option value="Fluent">Fluent</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Custom">Custom / Other...</option>
                                </select>
                            </div>

                            {selectValue === "Custom" && (
                                <Field 
                                    label="Custom Level" 
                                    value={currentLevel} 
                                    onChange={(v) => updateField(["languages", i, "level"], v)} 
                                    placeholder="e.g. Bilingual, C1, A2"
                                />
                            )}
                        </div>
                    </div>
                );
            })}
            <button onClick={() => addItem(["languages"], { name: "", level: "Fluent" })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-[#c7cad5] text-[#1c1c1e] hover:text-[#5b76fe] hover:border-[#5b76fe] bg-transparent hover:bg-white rounded-[12px] transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Language</button>
        </>
    );
}
