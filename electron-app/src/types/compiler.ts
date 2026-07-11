import { type StyleConfig } from "../lib/builder";

export interface CompileOptions {
    templateName?: string;
    styleConfig?: Partial<StyleConfig>;
    templatesDir: string;
    signal?: AbortSignal;
    haltOnError?: boolean;
}

export type CompileResult =
    | {
          success: true;
          pdfPath: string;
          warnings: string[];
          durationMs: number;
      }
    | {
          success: false;
          kind: "validation";
          error: string;
          validationErrors: Array<{ path: string; message: string }>;
          durationMs: number;
      }
    | {
          success: false;
          kind: "compilation";
          error: string;
          parsedError?: string;
          rawLog?: string;
          durationMs: number;
      }
    | {
          success: false;
          kind: "cancelled";
          error: string;
          durationMs: number;
      };
