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
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Import Breakdown Components
import { PersonalInfo } from "./FormSections/PersonalInfo";
import { Summary } from "./FormSections/Summary";
import { Experience } from "./FormSections/Experience";
import { Education } from "./FormSections/Education";
import { Projects } from "./FormSections/Projects";
import { Skills } from "./FormSections/Skills";
import { Awards } from "./FormSections/Awards";
import { SortableSectionItem } from "./FormSections/SortableSectionItem";

interface FormProps {
    jsonText: string;
    onChange: (newJson: string) => void;
}

export default function FormEditor({ jsonText, onChange }: FormProps) {
    const [data, setData] = useState<any>({});
    const [error, setError] = useState<string | null>(null);
    const isSyncing = useRef(false);

    useEffect(() => {
        if (isSyncing.current) return;
        try {
            const parsed = JSON.parse(jsonText);
            
            // Auto-convert old skills format to array format
            if (parsed.skills && typeof parsed.skills === 'object' && !Array.isArray(parsed.skills)) {
                parsed.skills = Object.keys(parsed.skills).map(category => ({
                    category,
                    items: parsed.skills[category]
                }));
            }

            setData(parsed);
            setError(null);
        } catch (e) {
            setError("JSON Parsing Error - Please fix the JSON in Editor Mode first to use the Form.");
        }
    }, [jsonText]);

    const handleChangeWithSync = (newData: any) => {
        isSyncing.current = true;
        setData(newData);
        onChange(JSON.stringify(newData, null, 2));
        
        // Use a short timeout to let the parent update component state before accepting new external changes
        setTimeout(() => {
            isSyncing.current = false;
        }, 100);
    };

    const updateField = (path: (string | number)[], value: any) => {
        const newData = { ...data };
        let current = newData;
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        handleChangeWithSync(newData);
    };

    const deleteItem = (path: (string | number)[], index: number) => {
        const newData = { ...data };
        let current = newData;
        for (let i = 0; i < path.length; i++) {
            current = current[path[i]];
        }
        if (Array.isArray(current)) {
            current.splice(index, 1);
            handleChangeWithSync(newData);
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
                handleChangeWithSync(newData);
            } else if (direction === 'down' && index < current.length - 1) {
                const temp = current[index];
                current[index] = current[index + 1];
                current[index + 1] = temp;
                handleChangeWithSync(newData);
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
            handleChangeWithSync(newData);
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
            <PersonalInfo data={data} updateField={updateField} />

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    {sectionOrder.map((sectionId: string) => {
                        let content = null;
                        if (sectionId === "summary") {
                            content = <Summary data={data} updateField={updateField} />;
                        }
                        else if (sectionId === "experience") {
                            content = <Experience data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} />;
                        }
                        else if (sectionId === "education") {
                            content = <Education data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} />;
                        }
                        else if (sectionId === "projects") {
                            content = <Projects data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} />;
                        }
                        else if (sectionId === "skills") {
                            content = <Skills data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} />;
                        }
                        else if (sectionId === "awards") {
                            content = <Awards data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} />;
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
                                    handleChangeWithSync(newData);
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
