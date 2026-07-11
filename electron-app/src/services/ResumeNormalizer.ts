/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeResume(input: string | unknown): any {
    const data = typeof input === "string" ? JSON.parse(input) : JSON.parse(JSON.stringify(input || {}));

    // Normalize arrays that Nunjucks filters expect
    if (data.skills) {
        if (typeof data.skills === 'object' && !Array.isArray(data.skills)) {
            data.skills = Object.keys(data.skills).map(category => ({
                category,
                items: Array.isArray(data.skills[category]) ? data.skills[category] : (typeof data.skills[category] === 'string' ? data.skills[category].split(',').map((s: string) => s.trim()) : [data.skills[category]])
            }));
        } else if (Array.isArray(data.skills)) {
            data.skills = data.skills.map((s: any) => ({
                ...s,
                items: Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? s.items.split(',').map((x: string) => x.trim()) : [])
            }));
        }
    }

    if (data.projects && Array.isArray(data.projects)) {
        data.projects = data.projects.map((p: any) => ({
            ...p,
            description: Array.isArray(p.description) ? p.description : (typeof p.description === 'string' ? [p.description] : [])
        }));
    }

    if (data.education && Array.isArray(data.education)) {
        data.education = data.education.map((e: any) => {
            const cw = e["Relevant coursework"];
            return {
                ...e,
                "Relevant coursework": Array.isArray(cw) ? cw : (typeof cw === 'string' ? cw.split(',').map((x: string) => x.trim()) : undefined)
            };
        });
    }

    return data;
}
