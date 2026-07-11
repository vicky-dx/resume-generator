import { User } from "lucide-react";
import { Field } from "./SharedComponents";

interface PersonalInfoProps {
    data: any;
    updateField: (path: (string | number)[], value: any) => void;
    errors?: Record<string, string>;
}

export function PersonalInfo({ data, updateField, errors }: PersonalInfoProps) {
    return (
        <div className="mb-6 bg-white ring-shadow-border rounded-[20px] transition-shadow">
            <div className="w-full flex items-center p-4 bg-[#c3faf5] border-b border-[#a8ede7] rounded-t-[20px]">
                <div className="bg-[#e2fdf9] p-1.5 rounded-[8px] text-[#187574] ring-[1px] ring-[rgb(224,226,232)] border border-[#c3faf5] mr-3">
                    <User className="w-4 h-4" />
                </div>
                <span className="font-display text-[22px] text-[#187574] tracking-[-0.72px] select-none">Personal Information</span>
            </div>
            <div className="p-6 bg-white rounded-b-[20px]">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" value={data.personal_info?.name || ""} onChange={(v) => updateField(["personal_info", "name"], v)} error={errors?.["personal_info.name"]} />
                    <Field label="Email" value={data.personal_info?.email || ""} onChange={(v) => updateField(["personal_info", "email"], v)} error={errors?.["personal_info.email"]} />
                    <Field label="Phone" value={data.personal_info?.phone || ""} onChange={(v) => updateField(["personal_info", "phone"], v)} error={errors?.["personal_info.phone"]} />
                    <Field label="Location" value={data.personal_info?.location || ""} onChange={(v) => updateField(["personal_info", "location"], v)} error={errors?.["personal_info.location"]} />
                    <Field label="GitHub" value={data.personal_info?.github || ""} onChange={(v) => updateField(["personal_info", "github"], v)} error={errors?.["personal_info.github"]} />
                    <Field label="LinkedIn" value={data.personal_info?.linkedin || ""} onChange={(v) => updateField(["personal_info", "linkedin"], v)} error={errors?.["personal_info.linkedin"]} />
                </div>
            </div>
        </div>
    );
}
