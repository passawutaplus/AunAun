import type { AboutCvModelInput } from "@/lib/aboutCvModel";
import type { AboutCvTheme } from "@/lib/aboutCvTheme";
import { downloadAboutCvPdf, saveBlob } from "@/lib/aboutCvPdf";

export type AboutCvDownloadResult = {
  /** "text" = selectable-text PDF; "image" = the screenshot PDF fallback. */
  kind: "text" | "image";
  photoSkipped: boolean;
};

/**
 * Preferred download: a real text PDF (searchable, Thai-safe). If building it
 * fails for any reason (font fetch, pdfkit chunk, ...) the owner still gets a
 * PDF from the old screenshot path instead of an error.
 */
export async function downloadAboutCvDocument(args: {
  input: AboutCvModelInput;
  theme: AboutCvTheme;
  filename: string;
}): Promise<AboutCvDownloadResult> {
  try {
    const [{ buildAboutCvModel }, { buildAboutCvTextPdf }] = await Promise.all([
      import("@/lib/aboutCvModel"),
      import("@/lib/aboutCvTextPdf"),
    ]);
    const model = buildAboutCvModel(args.input);
    const { blob, photoSkipped } = await buildAboutCvTextPdf(model, args.theme, {
      title: model.name || "About Me",
    });
    saveBlob(blob, args.filename);
    return { kind: "text", photoSkipped };
  } catch (e) {
    console.warn("[about-cv] text PDF failed, falling back to image PDF", e);
    await downloadAboutCvPdf(args.filename);
    return { kind: "image", photoSkipped: false };
  }
}
