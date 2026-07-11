import { RichTextArea } from "./SharedComponents";

export function Summary({ data, updateField, errors }: { data: any; updateField: any; errors?: Record<string, string> }) {
    return (
        <RichTextArea
            value={data.summary || ""}
            onChange={(v) => updateField(["summary"], v)}
            placeholder="A brief professional summary of your profile..."
            rows={4}
            error={errors?.summary}
        />
    );
}
