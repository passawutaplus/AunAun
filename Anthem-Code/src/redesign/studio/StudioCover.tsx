import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import { useSubscription } from "@/core/subscription";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { assertImageWithinUploadLimit, uploadProjectImage } from "@/lib/uploadImage";
import { saveStudioProfile } from "@/server/mutations/studio";
import { refreshMine } from "./useStudio";
import "../styles/profile-extras.css";

type Session = { file: File; original: File | null };

const isHttp = (v: string | null | undefined) => !!v && /^https?:\/\//i.test(v.trim());

async function fileOf(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("โหลดภาพต้นฉบับไม่ขึ้น");
  const blob = await res.blob();
  return new File([blob], "cover-original.jpg", { type: blob.type.startsWith("image/") ? blob.type : "image/jpeg" });
}

/**
 * Profile cover in My Studio › Profile, like the old profile header: upload → crop 32:9; "ปรับตำแหน่ง"
 * re-crops from the kept original (cover_original_url), so moving it never loses quality.
 */
export default function StudioCover({
  uid,
  cover,
  original,
  say,
}: {
  uid: string;
  cover: string | null | undefined;
  original: string | null | undefined;
  say: (t: string) => void;
}) {
  const qc = useQueryClient();
  const { tier } = useSubscription();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const hasCover = isHttp(cover);

  const done = (text: string) => {
    refreshMine(qc, uid);
    void qc.invalidateQueries({ queryKey: ["profile", uid] });
    say(text);
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    try {
      assertImageWithinUploadLimit(file);
    } catch (e) {
      say(e instanceof Error ? e.message : "ไฟล์ใหญ่เกินไป");
      return;
    }
    setSession({ file, original: file });
  };

  const adjust = async () => {
    if (!isHttp(original)) {
      // Covers made before the original was kept: pick the picture again.
      say("ยังไม่มีภาพต้นฉบับ เลือกภาพใหม่อีกครั้งนะ");
      input.current?.click();
      return;
    }
    setBusy(true);
    try {
      setSession({ file: await fileOf(original!.trim()), original: null });
    } catch (e) {
      say(e instanceof Error ? e.message : "เปิดภาพไม่ขึ้น ลองใหม่อีกทีนะ");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (cropped: File) => {
    const s = session;
    setSession(null);
    if (!s) return;
    setBusy(true);
    try {
      if (s.original) {
        const [originalUrl, coverUrl] = await Promise.all([
          uploadProjectImage(s.original, uid, "cover-original", tier),
          uploadProjectImage(cropped, uid, "cover", tier, { skipCompression: true }),
        ]);
        await saveStudioProfile(uid, { cover_url: coverUrl, cover_original_url: originalUrl });
      } else {
        const coverUrl = await uploadProjectImage(cropped, uid, "cover", tier, { skipCompression: true });
        await saveStudioProfile(uid, { cover_url: coverUrl });
      }
      done("อัปเดตภาพปกแล้ว");
    } catch (e) {
      say(e instanceof Error && e.message ? e.message : "อัปโหลดไม่สำเร็จ ลองใหม่อีกทีนะ");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("เอาภาพปกออกใช่ไหม")) return;
    setBusy(true);
    try {
      await saveStudioProfile(uid, { cover_url: null, cover_original_url: null });
      done("เอาภาพปกออกแล้ว");
    } catch {
      say("ลบไม่สำเร็จ ลองใหม่อีกทีนะ");
    } finally {
      setBusy(false);
    }
  };

  const src = hasCover ? proxiedImageUrl(cover!.trim(), 1200) : "";
  return (
    <div className="ms-pfr">
      <span className="ms-pfl">COVER</span>
      <div className={src ? "sc-cov" : "sc-cov sc-cov-none"} aria-busy={busy}>
        {src ? <img alt="ภาพปก" src={src} decoding="async" /> : <span>ยังไม่มีภาพปก</span>}
      </div>
      <div className="sc-cov-acts">
        <button type="button" className="ms-cpill" disabled={busy} onClick={() => input.current?.click()}>
          {hasCover ? "เปลี่ยนภาพปก" : "ใส่ภาพปก"}
        </button>
        {hasCover ? (
          <>
            <button type="button" className="ms-cpill" disabled={busy} onClick={() => void adjust()}>
              ปรับตำแหน่ง
            </button>
            <button type="button" className="ms-cpill" disabled={busy} onClick={() => void remove()}>
              เอาออก
            </button>
          </>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="ms-file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <CommunityImageCropDialog
        file={session?.file ?? null}
        aspect="coverBanner"
        open={!!session}
        onOpenChange={(open) => {
          if (!open) setSession(null);
        }}
        onCancel={() => setSession(null)}
        onConfirm={(file) => void confirm(file)}
        title="ปรับภาพปก"
        description="ลากและซูมให้พอดีกรอบ แล้วกดยืนยันนะ"
      />
    </div>
  );
}
