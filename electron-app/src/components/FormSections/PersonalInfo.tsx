import { Field } from "./SharedComponents";

interface PersonalInfoProps {
    data: any;
    updateField: (path: (string | number)[], value: any) => void;
}

export function PersonalInfo({ data, updateField }: PersonalInfoProps) {
    return (
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
    );
}
