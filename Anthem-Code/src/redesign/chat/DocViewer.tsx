import { PrintableDocumentPaper } from "@/components/documents/DocumentPaper";
import { useStudioDoc } from "@/hooks/useStudioDocuments";
import { docDisplayStatus } from "@/lib/documents/studioDocuments";
import ChatSheet from "./ChatSheet";

/**
 * A studio document opened from its chat card: the same paper as the old chat (with "ดาวน์โหลด PDF / พิมพ์").
 * Viewing only for now; paying / voiding come back with the quotation and collab tools. Lazy: the paper is heavy.
 */
export default function DocViewer({ id, kind, number, onClose }: { id: string; kind: string; number: string; onClose: () => void }) {
  const { data: row, isLoading, isError, refetch } = useStudioDoc(id);
  const status = row ? docDisplayStatus(row) : null;
  return (
    <ChatSheet label={{ id: "cs-doc-h" }} onClose={onClose} wide>
      <div className="cs-doc-hd">
        <div>
          <p id="cs-doc-h" className="cs-h">
            {kind}
            {status ? ` · ${status.label}` : ""}
          </p>
          <p className="cs-sub">{[row?.doc_number || number, row?.title].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" className="cs-x" aria-label="ปิดเอกสาร" title="ปิด" onClick={onClose}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {isLoading ? (
        <p className="cs-state" role="status">
          กำลังเปิดเอกสาร…
        </p>
      ) : isError ? (
        <div className="sc-load-error" role="alert">
          <p>เปิดเอกสารไม่ขึ้น ลองใหม่อีกทีนะ</p>
          <button type="button" className="sc-load-error-btn" onClick={() => void refetch()}>
            ลองใหม่
          </button>
        </div>
      ) : row?.snapshot ? (
        <PrintableDocumentPaper doc={row.snapshot} />
      ) : (
        <p className="cs-state" role="status">
          เปิดเอกสารนี้ไม่ได้นะ อาจถูกยกเลิกไปแล้ว หรือคุณไม่ได้อยู่ในงานนี้
        </p>
      )}
    </ChatSheet>
  );
}
