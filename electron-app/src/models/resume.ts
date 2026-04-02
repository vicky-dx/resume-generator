/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

// Utility for cleaning strings recursively

// Helper for coercing primitive arrays from either a string or an array of strings
const coerceStringArray = (separator: string | RegExp) =>
    z.preprocess((val) => {
        if (typeof val === "string") {
            return val
                .split(separator)
                .map((s) => s.trim())
                .filter(Boolean);
        }
        if (Array.isArray(val)) {
            return val.map((s) => (typeof s === "string" ? s.trim() : s)).filter(Boolean);
        }
        return val;
    }, z.array(z.string()).default([]));

// --- Schemas --- //

export const PersonalInfoSchema = z.object({
    name: z.string().default(""),
    location: z.string().default(""),
    tagline: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    github: z.string().default(""),
    linkedin: z.string().default(""),
});

export const SkillCategorySchema = z.object({
    category: z.string().default(""),
    items: coerceStringArray(","),
});

export const ExperienceSchema = z.object({
    company: z.string().default(""),
    // Handle aliases: "title" is the UI standard, "position" is the LaTeX template output
    position: z.string().default(""), // Mapping `title` to `position` during processing if needed, but keeping it simple for the editor.
    location: z.string().default(""),
    work_type: z.string().default(""),
    duration: z.string().default(""), // Maps "date" -> "duration" in python
    achievements: coerceStringArray("\n"),
});

export const EducationSchema = z.object({
    institution: z.string().default(""),
    degree: z.string().default(""),
    location: z.string().default(""),
    duration: z.string().default(""),
    gpa: z.string().default(""),
    "Relevant coursework": coerceStringArray(/,\s*/),
});

export const ProjectSchema = z.object({
    name: z.string().default(""),
    technologies: z.string().default(""), // Used instead of tech_stack
    year: z.string().default(""),         // Alias for date
    description: coerceStringArray("\n"),
});

export const LibraryProjectSchema = ProjectSchema.extend({
    source: z.string().default(""),
});

export const AwardSchema = z.object({
    title: z.string().default(""),
    issuer: z.string().default(""),
    description: z.string().default(""),  // Alias for date in Pydantic
});

export const ResumeDataSchema = z.object({
    personal_info: PersonalInfoSchema.optional(),
    summary: z.string().default(""),

    // Custom preprocessor to handle Record<string, string[]> legacy formats -> Array<{category, items}>
    skills: z.preprocess((val) => {
        if (val && typeof val === "object" && !Array.isArray(val)) {
            return Object.entries(val).map(([category, items]) => ({ category, items }));
        }
        return val;
    }, z.array(SkillCategorySchema).default([])),

    // Using preprocessors from Pydantic's aliases
    experience: z.array(
        z.preprocess((val: any) => {
            if (val && typeof val === "object") {
                return {
                    ...val,
                    position: val.position ?? val.title,
                    duration: val.duration ?? val.date,
                };
            }
            return val;
        }, ExperienceSchema)
    ).default([]),

    education: z.array(
        z.preprocess((val: any) => {
            if (val && typeof val === "object") {
                return {
                    ...val,
                    "Relevant coursework": val["Relevant coursework"] ?? val.coursework,
                    duration: val.duration ?? val.date,
                };
            }
            return val;
        }, EducationSchema)
    ).default([]),

    projects: z.array(
        z.preprocess((val: any) => {
            if (val && typeof val === "object") {
                return {
                    ...val,
                    technologies: val.technologies ?? val.tech_stack,
                    year: val.year ?? val.date,
                };
            }
            return val;
        }, ProjectSchema)
    ).default([]),

    awards: z.array(
        z.preprocess((val: any) => {
            // Coerce plain strings to localized Award objects
            if (typeof val === "string") {
                return { title: val, issuer: "", description: "" };
            }
            if (val && typeof val === "object") {
                return {
                    ...val,
                    description: val.description ?? val.date,
                };
            }
            return val;
        }, AwardSchema)
    ).default([]),
});

// Infer TypeScript types from our schemas
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type LibraryProject = z.infer<typeof LibraryProjectSchema>;
export type Award = z.infer<typeof AwardSchema>;
export type ResumeData = z.infer<typeof ResumeDataSchema>;

