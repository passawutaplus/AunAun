/** Session handoff: Doc Lab processed files → quotation client pack */

export const DOC_LAB_HANDOFF_KEY = "so1o.docLabHandoff";
export const DOC_LAB_HANDOFF_EVENT = "so1o:doc-lab-handoff";
export const OPEN_CLIENT_PACK_KEY = "so1o.openClientPack";

export type DocLabHandoffFile = {
  name: string;
  mimeType: string;
  /** base64 without data: prefix */
  base64: string;
};

export type DocLabHandoff = {
  files: DocLabHandoffFile[];
  quotationId?: string;
};

export function storeDocLabHandoff(payload: DocLabHandoff): void {
  try {
    sessionStorage.setItem(DOC_LAB_HANDOFF_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(DOC_LAB_HANDOFF_EVENT));
  } catch {
    /* noop */
  }
}

export async function fileToHandoffEntry(file: File): Promise<DocLabHandoffFile> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    base64: btoa(binary),
  };
}

export function consumeDocLabHandoff(): DocLabHandoff | null {
  try {
    const raw = sessionStorage.getItem(DOC_LAB_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(DOC_LAB_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as DocLabHandoff;
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requestOpenClientPack(quotationId?: string): void {
  try {
    sessionStorage.setItem(OPEN_CLIENT_PACK_KEY, "1");
    if (quotationId) sessionStorage.setItem("so1o.openQuotationId", quotationId);
  } catch {
    /* noop */
  }
}

export function consumeOpenClientPackRequest(): boolean {
  try {
    const v = sessionStorage.getItem(OPEN_CLIENT_PACK_KEY);
    if (v !== "1") return false;
    sessionStorage.removeItem(OPEN_CLIENT_PACK_KEY);
    return true;
  } catch {
    return false;
  }
}

export function handoffEntryToFile(entry: DocLabHandoffFile): File {
  const binary = atob(entry.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], entry.name, { type: entry.mimeType });
}
