import { RichTextArea } from "./SharedComponents";

export function Summary({ data, updateField }: { data: any; updateField: any }) {
    return (
        <RichTextArea 
            value={data.summary || ""} 
            onChange={(v) => updateField(["summary"], v)} 
            placeholder="A brief professional summary of your profile..." 
            rows={4} 
        />
    );
}
