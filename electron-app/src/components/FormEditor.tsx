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
import { Awards } from "./FormSections/Awards";
import { Education } from "./FormSections/Education";
import { Experience } from "./FormSections/Experience";
import { PersonalInfo } from "./FormSections/PersonalInfo";
import { Projects } from "./FormSections/Projects";
import { Skills } from "./FormSections/Skills";
import { SortableSectionItem } from "./FormSections/SortableSectionItem";
import { Summary } from "./FormSections/Summary";
import { Languages } from "./FormSections/Languages";
import { ResumeDataSchema } from "../models/resume";

interface FormProps {
    jsonText: string;
    onChange: (newJson: string) => void;
}

export default function FormEditor({ jsonText, onChange }: FormProps) {
    const [data, setData] = useState<any>({});
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const isSyncing = useRef(false);

    useEffect(() => {
        if (!data || Object.keys(data).length === 0) {
            setValidationErrors({});
            return;
        }
        const res = ResumeDataSchema.safeParse(data);
        if (!res.success) {
            const errors: Record<string, string> = {};
            res.error.issues.forEach(issue => {
                const pathKey = issue.path.join(".");
                errors[pathKey] = issue.message;
            });
            setValidationErrors(errors);
        } else {
            setValidationErrors({});
        }
    }, [data]);

    useEffect(() => {
        if (isSyncing.current) return;
        try {
            const parsed = JSON.parse(jsonText);

            // Auto-convert old skills format to array format
            if (parsed.skills && typeof parsed.skills === 'object' && !Array.isArray(parsed.skills)) {
                parsed.skills = Object.keys(parsed.skills).map(category => ({
                    category,
                    items: Array.isArray(parsed.skills[category]) ? parsed.skills[category] : (typeof parsed.skills[category] === 'string' ? parsed.skills[category].split(',') : [parsed.skills[category]])
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

    const deleteSection = (sectionId: string) => {
        const newData = { ...data };
        delete newData[sectionId];
        if (Array.isArray(newData.section_order)) {
            newData.section_order = newData.section_order.filter((s: string) => s !== sectionId);
        }
        handleChangeWithSync(newData);
    };

    const defaultOrder = ["summary", "skills", "experience", "projects", "education", "languages", "awards"];
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
        <div className="flex items-center justify-center h-full text-[#600000] bg-[#fbd4d4] p-8 text-center">{error}</div>
    );

    const sectionTitles: Record<string, string> = {
        summary: "Professional Summary",
        experience: "Work Experience",
        education: "Education",
        projects: "Projects",
        skills: "Skills",
        languages: "Languages & Proficiency",
        awards: "Awards & Certificates"
    };

    const sectionThemes: Record<string, { bg: string, text: string, border: string }> = {
        summary: { bg: "bg-[#ffe6cd]", text: "text-[#746019]", border: "border-[#f5d5b5]" }, // Orange
        experience: { bg: "bg-[#c3faf5]", text: "text-[#187574]", border: "border-[#a8ede7]" }, // Teal
        education: { bg: "bg-[#ffd8f4]", text: "text-[#1c1c1e]", border: "border-[#f7cbe8]" }, // Rose
        projects: { bg: "bg-[#fde0f0]", text: "text-[#1c1c1e]", border: "border-[#f5d3e5]" }, // Pink
        skills: { bg: "bg-[#ffc6c6]", text: "text-[#600000]", border: "border-[#f7b7b7]" }, // Coral
        languages: { bg: "bg-[#eadeff]", text: "text-[#4a154b]", border: "border-[#d8beff]" }, // Lavender
        awards: { bg: "bg-[#e3c5c5]", text: "text-[#600000]", border: "border-[#d9b8b8]" } // Muted Red
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-white text-[#1c1c1e]">
            {/* Personal Info Box (Always on Top) */}
            <PersonalInfo data={data} updateField={updateField} errors={validationErrors} />

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    {sectionOrder.map((sectionId: string) => {
                        let content = null;
                        if (sectionId === "summary") {
                            content = <Summary data={data} updateField={updateField} errors={validationErrors} />;
                        }
                        else if (sectionId === "experience") {
                            content = <Experience data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} errors={validationErrors} />;
                        }
                        else if (sectionId === "education") {
                            content = <Education data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} errors={validationErrors} />;
                        }
                        else if (sectionId === "projects") {
                            content = <Projects data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} errors={validationErrors} />;
                        }
                        else if (sectionId === "skills") {
                            content = <Skills data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} errors={validationErrors} />;
                        }
                        else if (sectionId === "languages") {
                            content = <Languages data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} errors={validationErrors} />;
                        }
                        else if (sectionId === "awards") {
                            content = <Awards data={data} updateField={updateField} moveItem={moveItem} deleteItem={deleteItem} addItem={addItem} errors={validationErrors} />;
                        }

                        if (!content) return null;

                        const sectionHasErrors = Object.keys(validationErrors).some(
                            (key) => key === sectionId || key.startsWith(sectionId + ".")
                        );

                        return (
                            <SortableSectionItem
                                key={sectionId}
                                id={sectionId}
                                title={sectionTitles[sectionId]}
                                theme={sectionThemes[sectionId]}
                                onDelete={() => deleteSection(sectionId)}
                                hasError={sectionHasErrors}
                            >
                                {content}
                            </SortableSectionItem>
                        );
                    })}
                </SortableContext>
            </DndContext>

            {hiddenSections.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#c7cad5]/50">
                    <div className="mb-4 text-xs font-semibold text-[#a5a8b5] uppercase tracking-widest">Available Sections</div>
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
                                className="flex items-center gap-1.5 px-[16px] py-[8px] bg-white text-[#1c1c1e] hover:text-[#2a41b6] ring-shadow-border border border-transparent hover:border-[#5b76fe] rounded-[8px] text-sm transition-all font-medium"
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
