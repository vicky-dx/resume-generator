import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { compileResume } from "./services/ResumeCompiler.js";
import { normalizeResume } from "./services/ResumeNormalizer.js";
import { ResumeDataSchema } from "./models/resume.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In dev/running via tsx, __dirname is: electron-app/src
const templatesDir = path.resolve(__dirname, "../../templates");

// --- Initialize MCP Server ---

const server = new Server(
    {
        name: "resume-generator-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_templates",
                description: "Lists all available LaTeX templates in the project.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "validate_resume",
                description: "Validates resume JSON data against the application's schema.",
                inputSchema: {
                    type: "object",
                    properties: {
                        resumeData: {
                            type: "object",
                            description: "The complete resume data object to validate.",
                        },
                    },
                    required: ["resumeData"],
                },
            },
            {
                name: "generate_resume_pdf",
                description: "Generates a LaTeX resume and compiles it to PDF using xelatex.",
                inputSchema: {
                    type: "object",
                    properties: {
                        resumeData: {
                            type: "object",
                            description: "The complete resume data object.",
                        },
                        outputPath: {
                            type: "string",
                            description: "The absolute file path where the generated PDF should be saved.",
                        },
                        templateName: {
                            type: "string",
                            description: "The template filename to use (e.g. 'classic.tex'). Defaults to 'classic.tex'.",
                        },
                        styleConfig: {
                            type: "object",
                            description: "Optional style override options (font, font_size, section_color [R,G,B], margin_tb, margin_lr, etc.).",
                        },
                    },
                    required: ["resumeData", "outputPath"],
                },
            },
        ],
    };
});

// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "list_templates") {
            if (!fs.existsSync(templatesDir)) {
                return {
                    content: [{ type: "text", text: `Templates directory not found at: ${templatesDir}` }],
                    isError: true,
                };
            }
            const files = await fs.promises.readdir(templatesDir);
            const texTemplates = files.filter((f) => f.endsWith(".tex"));
            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${texTemplates.length} LaTeX templates at ${templatesDir}:\n` +
                              texTemplates.map((t) => `- ${t}`).join("\n"),
                    },
                ],
            };
        }

        if (name === "validate_resume") {
            const resumeData = (args as any)?.resumeData;
            if (!resumeData) {
                return {
                    content: [{ type: "text", text: "Error: Missing 'resumeData' parameter." }],
                    isError: true,
                };
            }

            const normalized = normalizeResume(resumeData);
            const parseResult = ResumeDataSchema.safeParse(normalized);
            if (!parseResult.success) {
                const formattedErrors = parseResult.error.errors
                    .map((err) => `- Path: "${err.path.join(".")}" -> ${err.message}`)
                    .join("\n");
                return {
                    content: [
                        {
                            type: "text",
                            text: `Validation failed with the following errors:\n${formattedErrors}`,
                        },
                    ],
                    isError: true,
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: "Resume data is valid. Normalized data:\n" + JSON.stringify(parseResult.data, null, 2),
                    },
                ],
            };
        }

        if (name === "generate_resume_pdf") {
            const resumeData = (args as any)?.resumeData;
            const outputPath = (args as any)?.outputPath;
            const templateName = (args as any)?.templateName || "classic.tex";
            const customStyle = (args as any)?.styleConfig || {};

            if (!resumeData || !outputPath) {
                return {
                    content: [{ type: "text", text: "Error: Both 'resumeData' and 'outputPath' are required parameters." }],
                    isError: true,
                };
            }

            const result = await compileResume(resumeData, {
                templateName,
                styleConfig: customStyle,
                templatesDir,
            });

            if (!result.success) {
                if (result.kind === "validation") {
                    return {
                        content: [{ type: "text", text: result.error }],
                        isError: true,
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `LaTeX Compilation Failed:\n${result.error}` +
                                      (result.parsedError ? `\n\nPrecise Error:\n${result.parsedError}` : ""),
                            },
                        ],
                        isError: true,
                    };
                }
            }

            // Copy compiled temp PDF to user's desired output path
            try {
                const destFolder = path.dirname(outputPath);
                await fs.promises.mkdir(destFolder, { recursive: true });
                await fs.promises.copyFile(result.pdfPath, outputPath);
            } catch (copyErr: any) {
                return {
                    content: [{ type: "text", text: `Failed to save compiled PDF to destination: ${copyErr.message}` }],
                    isError: true,
                };
            }

            return {
                content: [{ type: "text", text: `Success! Resume PDF successfully compiled and saved to: ${outputPath}` }],
            };
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Unexpected Error during execution: ${error.message || error}` }],
            isError: true,
        };
    }
});

// Start transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Server is running via Stdio transport.");
