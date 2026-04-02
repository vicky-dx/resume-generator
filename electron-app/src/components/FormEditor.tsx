/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Bold, ChevronDown, ChevronRight, GripVertical, Italic, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface FormProps {
    jsonText: string;
    onChange: (newJson: string) => void;
}

export default function FormEditor({ jsonText, onChange }: FormProps) {
    const [data, setData] = useState<any>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            setData(JSON.parse(jsonText));
            setError(null);
        } catch (e) {
            setError("JSON Parsing Error - Please fix the JSON in Editor Mode first to use the Form.");
        }
    }, [jsonText]);

    const updateField = (path: (string | number)[], value: any) => {
        const newData = { ...data };
        let current = newData;
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        onChange(JSON.stringify(newData, null, 2));
    };

    const deleteItem = (path: (string | number)[], index: number) => {
        const newData = { ...data };
        let current = newData;
        for (let i = 0; i < path.length; i++) {
            current = current[path[i]];
        }
        if (Array.isArray(current)) {
            current.splice(index, 1);
            onChange(JSON.stringify(newData, null, 2));
        }
    };

    const moveItem = (path: (string | number)[], index: number, direction: 'up' | 'down') => {
        const newData = { ...data };
        let current = newData;
        for (let i = 0; i < path.length; i++) {
            if (!current[path[i]]) return;
            current = current[path[i]];
        }
        if (Array.isArray(current)) {
            if (direction === 'up' && index > 0) {
                const temp = current[index];
                current[index] = current[index - 1];
                current[index - 1] = temp;
                onChange(JSON.stringify(newData, null, 2));
            } else if (direction === 'down' && index < current.length - 1) {
                const temp = current[index];
                current[index] = current[index + 1];
                current[index + 1] = temp;
                onChange(JSON.stringify(newData, null, 2));
            }
        }
    };

    const addItem = (path: (string | number)[], template: any) => {
        const newData = { ...data };
        let current = newData;
        for (let i = 0; i < path.length; i++) {
            if (!current[path[i]]) current[path[i]] = [];
            current = current[path[i]];
        }
        if (Array.isArray(current)) {
            current.push(template);
            onChange(JSON.stringify(newData, null, 2));
        }
    };

    const defaultOrder = ["summary", "skills", "experience", "projects", "education", "awards"];
    const sectionOrder = (Array.isArray(data.section_order) && data.section_order.length > 0)
        ? data.section_order
        : defaultOrder.filter(s => data[s] !== undefined);

    const hiddenSections = defaultOrder.filter(s => !sectionOrder.includes(s));

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sectionOrder.indexOf(active.id as string);
            const newIndex = sectionOrder.indexOf(over.id as string);
            const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
            updateField(["section_order"], newOrder);
        }
    };

    if (error) return (
        <div className="flex items-center justify-center h-full text-red-500 bg-[#0A0A0B] p-8 text-center">{error}</div>
    );

    const sectionTitles: Record<string, string> = {
        summary: "Professional Summary",
        experience: "Work Experience",
        education: "Education",
        projects: "Projects",
        skills: "Skills",
        awards: "Awards & Certificates"
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0B] text-neutral-300">
            {/* Personal Info Box (Always on Top) */}
            <div className="mb-6 bg-[#0E0E10] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="w-full flex items-center p-4 bg-[#141415] border-b border-neutral-800">
                    <span className="font-semibold text-neutral-200 tracking-wide select-none">Personal Information</span>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Full Name" value={data.personal_info?.name || ""} onChange={(v) => updateField(["personal_info", "name"], v)} />
                        <Field label="Email" value={data.personal_info?.email || ""} onChange={(v) => updateField(["personal_info", "email"], v)} />
                        <Field label="Phone" value={data.personal_info?.phone || ""} onChange={(v) => updateField(["personal_info", "phone"], v)} />
                        <Field label="Location" value={data.personal_info?.location || ""} onChange={(v) => updateField(["personal_info", "location"], v)} />
                        <Field label="GitHub" value={data.personal_info?.github || ""} onChange={(v) => updateField(["personal_info", "github"], v)} />
                        <Field label="LinkedIn" value={data.personal_info?.linkedin || ""} onChange={(v) => updateField(["personal_info", "linkedin"], v)} />
                    </div>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    {sectionOrder.map((sectionId: string) => {
                        let content = null;
                        if (sectionId === "summary") {
                            content = <RichTextArea value={data.summary || ""} onChange={(v) => updateField(["summary"], v)} placeholder="A brief professional summary of your profile..." rows={4} />;
                        }
                        else if (sectionId === "experience") {
                            content = (
                                <>
                                    {data.experience?.map((exp: any, i: number) => (
                                        <div key={i} className="mb-6 p-5 border border-neutral-800 bg-[#141415] rounded-xl relative group transition-all hover:border-neutral-700">
                                            <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button title="Move Up" onClick={() => moveItem(["experience"], i, 'up')} disabled={i === 0} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                                                <button title="Move Down" onClick={() => moveItem(["experience"], i, 'down')} disabled={i === (data.experience?.length || 1) - 1} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                                                <button title="Delete" onClick={() => deleteItem(["experience"], i)} className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-5 pr-28">
                                                <Field label="Company" value={exp.company || ""} onChange={(v) => updateField(["experience", i, "company"], v)} />
                                                <Field label="Position" value={exp.position || ""} onChange={(v) => updateField(["experience", i, "position"], v)} />
                                                <Field label="Duration" value={exp.duration || ""} onChange={(v) => updateField(["experience", i, "duration"], v)} />
                                                <Field label="Location" value={exp.location || ""} onChange={(v) => updateField(["experience", i, "location"], v)} />
                                            </div>
                                            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Achievements (One per line)</div>
                                            <RichTextArea rows={5} value={[].concat(exp.achievements || []).join("\n")} onChange={(v) => updateField(["experience", i, "achievements"], v.split("\n"))} placeholder="- Engineered highly scalable microservices..." />
                                        </div>
                                    ))}
                                    <button onClick={() => addItem(["experience"], { company: "", position: "", duration: "", achievements: [] })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-neutral-800 text-neutral-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Experience</button>
                                </>
                            );
                        }
                        else if (sectionId === "education") {
                            content = (
                                <>
                                    {data.education?.map((edu: any, i: number) => (
                                        <div key={i} className="mb-5 p-5 border border-neutral-800 bg-[#141415] rounded-xl relative group transition-all hover:border-neutral-700">
                                            <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button title="Move Up" onClick={() => moveItem(["education"], i, 'up')} disabled={i === 0} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                                                <button title="Move Down" onClick={() => moveItem(["education"], i, 'down')} disabled={i === (data.education?.length || 1) - 1} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                                                <button title="Delete" onClick={() => deleteItem(["education"], i)} className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pr-28">
                                                <Field label="Degree / Course" value={edu.degree || ""} onChange={(v) => updateField(["education", i, "degree"], v)} />
                                                <Field label="Institution" value={edu.institution || ""} onChange={(v) => updateField(["education", i, "institution"], v)} />
                                                <Field label="Duration" value={edu.duration || ""} onChange={(v) => updateField(["education", i, "duration"], v)} />
                                                <Field label="Score / GPA" value={edu.gpa || edu.score || ""} onChange={(v) => updateField(["education", i, "gpa"], v)} />
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => addItem(["education"], { degree: "", institution: "", duration: "", gpa: "" })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-neutral-800 text-neutral-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Education</button>
                                </>
                            );
                        }
                        else if (sectionId === "projects") {
                            content = (
                                <>
                                    {data.projects?.map((proj: any, i: number) => (
                                        <div key={i} className="mb-6 p-5 border border-neutral-800 bg-[#141415] rounded-xl relative group transition-all hover:border-neutral-700">
                                            <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button title="Move Up" onClick={() => moveItem(["projects"], i, 'up')} disabled={i === 0} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                                                <button title="Move Down" onClick={() => moveItem(["projects"], i, 'down')} disabled={i === (data.projects?.length || 1) - 1} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                                                <button title="Delete" onClick={() => deleteItem(["projects"], i)} className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-5 pr-28">
                                                <Field label="Project Name" value={proj.name || proj.title || ""} onChange={(v) => updateField(["projects", i, "name"], v)} />
                                                <Field label="Technologies Used" value={proj.technologies || proj.tech_stack || ""} onChange={(v) => updateField(["projects", i, "technologies"], v)} placeholder="e.g. React, Node.js, Vercel" />
                                                <Field label="Date/Year" value={proj.year || proj.date || ""} onChange={(v) => updateField(["projects", i, "year"], v)} placeholder="e.g. 2026" />
                                            </div>
                                            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Description / Highlights (One per line)</div>
                                            <RichTextArea rows={5} value={[].concat(proj.description || proj.highlights || []).join("\n")} onChange={(v) => updateField(["projects", i, "description"], v.split("\n"))} placeholder="- Built user interface using..." />
                                        </div>
                                    ))}
                                    <button onClick={() => addItem(["projects"], { name: "", technologies: "", year: "", description: [] })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-neutral-800 text-neutral-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Project</button>
                                </>
                            );
                        }
                        else if (sectionId === "skills") {
                            content = (
                                <>
                                    {data.skills?.map((skill: any, i: number) => (
                                        <div key={i} className="mb-4 p-5 border border-neutral-800 bg-[#141415] rounded-xl relative group flex flex-col gap-4 transition-all hover:border-neutral-700">
                                            <div className="absolute top-5 right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button title="Move Up" onClick={() => moveItem(["skills"], i, 'up')} disabled={i === 0} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                                                <button title="Move Down" onClick={() => moveItem(["skills"], i, 'down')} disabled={i === (data.skills?.length || 1) - 1} className="hover:text-blue-400 disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                                                <button title="Delete" onClick={() => deleteItem(["skills"], i)} className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                                            </div>

                                            <div className="pr-28">
                                                <Field label="Category" value={skill.category || ""} onChange={(v) => updateField(["skills", i, "category"], v)} placeholder="e.g. Languages" />
                                            </div>
                                            <div className="pr-24 cursor-text">
                                                <Field label="Items (Comma separated)" value={[].concat(skill.items || []).join(", ")} onChange={(v) => updateField(["new_items"], v.split(",").map((x: string) => x.trim()).filter((x: string) => x))} placeholder="Python, JavaScript, C++" />
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => addItem(["skills"], { category: "", items: [] })} className="group flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-neutral-800 text-neutral-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl transition-all font-medium"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Skill Category</button>
                                </>
                            );
                        }
                        else if (sectionId === "awards") {
                            content = (
                                <>
                                    {data.awards?.map((award: any, i: number) => (
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

                        if (!content) return null;

                        return (
                            <SortableSectionItem key={sectionId} id={sectionId} title={sectionTitles[sectionId]}>
                                {content}
                            </SortableSectionItem>
                        );
                    })}
                </SortableContext>
            </DndContext>

            {hiddenSections.length > 0 && (
                <div className="mt-8 pt-6 border-t border-neutral-800/50">
                    <div className="mb-4 text-xs font-semibold text-neutral-500 uppercase tracking-widest">Available Sections</div>
                    <div className="flex flex-wrap gap-2">
                        {hiddenSections.map(sectionId => (
                            <button
                                key={sectionId}
                                onClick={() => {
                                    const newData = { ...data };
                                    if (sectionId === "summary") newData.summary = "";
                                    else newData[sectionId] = [];
                                    newData.section_order = [...sectionOrder, sectionId];
                                    onChange(JSON.stringify(newData, null, 2));
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-[#141415] text-neutral-400 hover:text-blue-400 border border-neutral-800 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg text-sm transition-all font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                {sectionTitles[sectionId]}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="h-32"></div>
        </div>
    );
}

// --- Sub-components ---

function SortableSectionItem({ id, title, children }: { id: string, title: string, children: React.ReactNode }) {
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

// Rich Text Area Wrapper
function RichTextArea({ value, onChange, placeholder, rows = 4 }: { value: string, onChange: (v: string) => void, placeholder?: string, rows?: number }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const applyStyling = (wrapperStart: string, wrapperEnd: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const beforeSelection = value.substring(0, start);
        const afterSelection = value.substring(end);
        let newValue;

        if (beforeSelection.endsWith(wrapperStart) && afterSelection.startsWith(wrapperEnd)) {
            newValue = beforeSelection.slice(0, -wrapperStart.length) + selectedText + afterSelection.slice(wrapperEnd.length);
        } else {
            const replacement = wrapperStart + selectedText + wrapperEnd;
            newValue = beforeSelection + replacement + afterSelection;
        }

        onChange(newValue);
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + wrapperStart.length + selectedText.length + wrapperEnd.length;
            textarea.setSelectionRange(start, newCursorPos);
        }, 0);
    };

    return (
        <div className="group border border-neutral-800 rounded-lg overflow-hidden bg-[#1D1D20] focus-within:border-blue-500/50 transition-all focus-within:ring-1 focus-within:ring-blue-500/50">
            <div className="flex items-center gap-1 bg-[#232326] px-2 py-1.5 border-b border-neutral-800/80">
                <button onClick={() => applyStyling("**", "**")} title="Bold (**text**)" className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded transition-colors"><Bold className="w-4 h-4" /></button>
                <button onClick={() => applyStyling("*", "*")} title="Italic (*text*)" className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded transition-colors"><Italic className="w-4 h-4" /></button>
            </div>
            <textarea ref={textareaRef} className="w-full bg-transparent p-3 text-sm outline-none resize-y text-neutral-200 placeholder:text-neutral-600 leading-relaxed" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

// Helpers
function Field({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    return (
        <label className="flex flex-col gap-1.5 w-full">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest px-1">{label}</span>
            <input className="w-full bg-[#1D1D20] border border-neutral-800 rounded-lg p-2.5 text-sm text-neutral-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-neutral-600 hover:border-neutral-700" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </label>
    );
}
