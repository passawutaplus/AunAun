import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/core/subscription";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { displayProfileAddress } from "@/lib/profileAddress";
import { saveStudioProfile, uploadAvatar, type StudioProfilePatch } from "@/server/mutations/studio";
import type { StudioProfile as Row } from "@/server/queries/studio";
import { SC_CATEGORIES } from "../lib/categories";
import { refreshMine } from "./useStudio";
import "../styles/about-cv.css";

// The CV editor is the old full editor (templates, A4 preview…): loaded only when opened.
const CvEditorSheet = lazy(() => import("../profile/CvEditorSheet"));

const BIO_MAX = 160;
const NAME_MAX = 60;
const NAME_LOCK_DAYS = 30;
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thDate = (d: Date) => `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errText = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "");

const splitList = (s: string) => [...new Set(s.split(/[,，、\n]/).map((t) => t.trim()).filter(Boolean))].slice(0, 20);

type Form = { name: string; bio: string; cats: string[]; tools: string; city: string; ig: string; mail: string; web: string };

const formOf = (p: Row | null): Form => ({
  name: p?.display_name ?? "",
  bio: p?.bio ?? "",
  cats: p?.sc_categories ?? [],
  tools: (p?.skills ?? []).join(", "),
  city: displayProfileAddress(p?.profile_address, p?.location, "short"),
  ig: p?.instagram ?? "",
  mail: p?.contact_email ?? "",
  web: p?.website ?? "",
});

/** My Studio → Profile: picture, name, bio, CATEGORY, tools, city, contacts (mock MyStudio "Profile"). */
export default function StudioProfile({ uid, profile, say }: { uid: string; profile: Row | null; say: (t: string) => void }) {
  const qc = useQueryClient();
  const { tier } = useSubscription();
  const start = useMemo(() => formOf(profile), [profile]);
  const [f, setF] = useState<Form>(start);
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cvOpen, setCvOpen] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  // When the row changes underneath (CV editor saved city/tools, a new photo…), take the new values
  // for every field not being edited here, so Save never writes an older value back.
  const prevStart = useRef(start);
  useEffect(() => {
    const old = prevStart.current;
    prevStart.current = start;
    if (old === start) return;
    setF((cur) => {
      const next: Record<string, unknown> = { ...cur };
      for (const k of Object.keys(start) as (keyof Form)[]) {
        if (JSON.stringify(cur[k]) === JSON.stringify(old[k])) next[k] = start[k];
      }
      return next as Form;
    });
  }, [start]);

  // The name can change once every 30 days after sign-up (DB trigger); the welcome step does not count.
  const changedAt = profile?.display_name_changed_at && profile.profile_onboarding_at ? new Date(profile.display_name_changed_at) : null;
  const lockEnds = changedAt ? new Date(changedAt.getTime() + NAME_LOCK_DAYS * 86_400_000) : null;
  const nameLocked = !!lockEnds && lockEnds.getTime() > Date.now();

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file, uid, tier);
      await saveStudioProfile(uid, { avatar_url: url });
      setAvatar(url);
      refreshMine(qc, uid);
      say("อัปโหลดรูปแล้ว");
    } catch (e) {
      say(errText(e) || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (saving) return;
    const patch: StudioProfilePatch = {};
    const name = f.name.trim().slice(0, NAME_MAX);
    if (name !== start.name.trim() && !nameLocked) {
      if (!name) {
        say("ใส่ชื่อก่อนบันทึก");
        return;
      }
      patch.display_name = name;
    }
    if (f.bio !== start.bio) patch.bio = f.bio.trim() || null;
    if (f.cats.join("|") !== start.cats.join("|")) patch.sc_categories = f.cats;
    if (f.tools.trim() !== start.tools.trim()) patch.skills = splitList(f.tools);
    if (f.city.trim() !== start.city.trim()) {
      patch.location = f.city.trim() || null;
      patch.profile_address = null;
    }
    if (f.ig.trim() !== start.ig.trim()) patch.instagram = f.ig.trim().replace(/^@/, "") || null;
    if (f.mail.trim() !== start.mail.trim()) {
      const m = f.mail.trim();
      if (m && !EMAIL.test(m)) {
        say("อีเมลไม่ถูกต้อง");
        return;
      }
      patch.contact_email = m || null;
    }
    if (f.web.trim() !== start.web.trim()) patch.website = f.web.trim() || null;
    setSaving(true);
    try {
      await saveStudioProfile(uid, patch);
      refreshMine(qc, uid);
      say("บันทึกโปรไฟล์แล้ว");
    } catch (e) {
      say(errText(e).includes("DISPLAY_NAME_COOLDOWN") ? `เปลี่ยนชื่อได้ทุก ${NAME_LOCK_DAYS} วัน` : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  const av = avatar ? proxiedImageUrl(avatar, 256) : "";
  return (
    <div className="ms-pf">
      <div className="ms-pf-l">
        <span aria-hidden="true" className={av ? "ms-pf-av" : "ms-pf-av ms-pf-av-none"} style={av ? { backgroundImage: `url("${av}")` } : undefined} />
        <button type="button" className="ms-cpill" aria-busy={uploading} disabled={uploading} onClick={() => fileIn.current?.click()}>
          {avatar ? "เปลี่ยนรูป" : "ใส่รูป"}
        </button>
        <input
          ref={fileIn}
          type="file"
          accept="image/*"
          className="ms-file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void pickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div className="ms-pf-r">
        <div className="ms-pfr">
          <label className="ms-pfl" htmlFor="pf-name">
            NAME
          </label>
          <input id="pf-name" className="ms-pfi" type="text" value={f.name} maxLength={NAME_MAX} readOnly={nameLocked} aria-describedby={nameLocked ? "pf-name-lock" : undefined} onChange={(e) => set({ name: e.target.value })} />
          {nameLocked && lockEnds ? (
            <span id="pf-name-lock" className="ms-pfl ms-pf-note">
              เปลี่ยนชื่อได้อีกครั้ง {thDate(lockEnds)}
            </span>
          ) : null}
        </div>
        <div className="ms-pfr">
          <span className="ms-pf-row">
            <label className="ms-pfl" htmlFor="pf-bio">
              BIO
            </label>
            <span className="ms-pfl">
              {f.bio.length}/{BIO_MAX}
            </span>
          </span>
          <textarea id="pf-bio" className="ms-pfi ms-pfta" rows={3} maxLength={BIO_MAX} value={f.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="แนะนำตัวสั้นๆ" />
        </div>
        <div className="ms-pfr">
          <span className="ms-pfl">CATEGORY</span>
          <div className="ms-chips">
            {SC_CATEGORIES.map((c) => {
              const on = f.cats.includes(c);
              return (
                <button key={c} type="button" className={on ? "ms-pill ms-pill-on" : "ms-pill"} aria-pressed={on} onClick={() => set({ cats: on ? f.cats.filter((x) => x !== c) : [...f.cats, c] })}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div className="ms-pf-two">
          <div className="ms-pfr">
            <label className="ms-pfl" htmlFor="pf-tools">
              TOOLS
            </label>
            <input id="pf-tools" className="ms-pfi" type="text" value={f.tools} onChange={(e) => set({ tools: e.target.value })} />
          </div>
          <div className="ms-pfr">
            <label className="ms-pfl" htmlFor="pf-city">
              CITY
            </label>
            <input id="pf-city" className="ms-pfi" type="text" value={f.city} maxLength={200} onChange={(e) => set({ city: e.target.value })} />
          </div>
        </div>
        <div className="ms-pfr">
          <span className="ms-pfl">CONTACT</span>
          <div className="ms-pf-three">
            <input aria-label="Instagram" className="ms-pfi" type="text" value={f.ig} onChange={(e) => set({ ig: e.target.value })} placeholder="Instagram" />
            <input aria-label="อีเมล" className="ms-pfi" type="email" value={f.mail} maxLength={254} onChange={(e) => set({ mail: e.target.value })} placeholder="อีเมล" />
            <input aria-label="เว็บไซต์" className="ms-pfi" type="url" value={f.web} maxLength={255} onChange={(e) => set({ web: e.target.value })} placeholder="เว็บไซต์" />
          </div>
        </div>
        <div className="ms-pf-save">
          <button type="button" className="ms-btn-ink" aria-busy={saving} onClick={() => void save()}>
            บันทึก
          </button>
        </div>
        <div className="ms-pfr acv-studio">
          <span className="ms-pfl">CV</span>
          <div className="acv-studio-box">
            <p>ประสบการณ์ การศึกษา รางวัล ภาษา — ใส่ไว้แล้วโหลดเป็น PDF ไปสมัครงานได้เลย</p>
            <button type="button" className="ms-cpill" onClick={() => setCvOpen(true)}>
              แก้ CV
            </button>
          </div>
        </div>
      </div>
      {cvOpen ? (
        <Suspense fallback={null}>
          <CvEditorSheet uid={uid} onClose={() => setCvOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
}
