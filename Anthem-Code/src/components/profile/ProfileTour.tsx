import { useEffect, useMemo, useRef } from "react";
import { GuideTour, type GuideTourStep } from "@/components/tour/GuideTour";

/** Profile tab shown behind the card for steps that explain a tab. */
const STEP_TAB: Record<string, string> = {
  overall: "overall",
  collections: "collections",
  designers: "designers",
  about: "about",
};

const STEPS: Omit<GuideTourStep, "onEnter">[] = [
  {
    id: "welcome",
    title: "Welcome",
    body: "พาชมหน้าโปรไฟล์ของคุณสั้น ๆ ดูอย่างเดียว ไม่ต้องกดอะไรจริง ย้อนกลับหรือปิดได้ตลอด",
  },
  {
    id: "cover",
    title: "Cover",
    body: "ภาพปกของโปรไฟล์ กดไอคอนกล้องที่มุมเพื่ออัปโหลด ปรับตำแหน่ง หรือเปลี่ยนภาพ",
    target: "profile-cover",
  },
  {
    id: "avatar",
    title: "Profile photo",
    body: "รูปโปรไฟล์ของคุณ ขึ้นทุกที่ที่มีชื่อคุณ เช่น ฟีด แชท และคำขอจ้าง",
    target: "profile-avatar",
  },
  {
    id: "edit",
    title: "Edit profile",
    body:
      "3 ส่วนใต้ชื่อ แก้ได้จากดินสอในหน้าต่างเดียว\n" +
      "• แถวบน — สายงาน: หมวดงานที่คุณทำ เช่น Graphic, Illustrator\n" +
      "• แถวกลาง — กำลังมองหา: สิ่งที่เปิดรับ เช่น หางานจ้าง ร่วมโปรเจกต์\n" +
      "• แถวล่าง — แนะนำตัว: ประโยคสั้น ๆ ให้คนรู้จักคุณ",
    target: "profile-edit",
  },
  {
    id: "stats",
    title: "Numbers",
    body: "จำนวนผลงาน ผู้ติดตาม และคนที่คุณติดตาม กดที่ตัวเลขเพื่อดูรายชื่อ",
    target: "profile-stats",
  },
  {
    id: "actions",
    title: "Quick actions",
    body: "My Studio คือที่จัดการคำขอจ้าง คอลแลป และผลงาน ส่วน “…” มีดูในมุมผู้เข้าชม ตั้งค่า และแชร์โปรไฟล์",
    target: "profile-actions",
    optional: true,
  },
  {
    id: "tabs",
    title: "Tabs",
    body: "โปรไฟล์แบ่งเป็นหมวด ตัวเลขข้างชื่อคือจำนวนในหมวดนั้น",
    target: "profile-tabs",
  },
  {
    id: "overall",
    title: "My Projects",
    body: "ผลงานทั้งหมดของคุณ เรียงตามลำดับที่ผู้เข้าชมเห็น ปักหมุดงานเด่นได้ และกด “จัดลำดับ” เพื่อลากเรียงใหม่",
    target: "profile-tab-overall",
  },
  {
    id: "collections",
    title: "Collections",
    body: "ที่เก็บผลงานของคนอื่นที่คุณชอบ จัดเป็นกลุ่ม ตั้งเป็นสาธารณะและแชร์ลิงก์ได้",
    target: "profile-tab-collections",
  },
  {
    id: "designers",
    title: "Designers",
    body: "ครีเอเตอร์ที่คุณติดตาม พร้อมสถานะว่าใครติดตามคุณกลับ คนที่ติดตามกันทั้งคู่แท็กเป็นผู้ร่วมงานในผลงานได้",
    target: "profile-tab-designers",
  },
  {
    id: "about",
    title: "About Me",
    body: "เอกสารแนะนำตัวแบบ CV สร้างเป็น PDF ได้ และมีลิงก์สำหรับส่งให้คนอื่น",
    target: "profile-tab-about",
  },
  {
    id: "final",
    title: "That's it",
    body: "ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? ข้างแถบหมวด หรือในตั้งค่า → ข้อมูลและความช่วยเหลือ",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tab currently shown; the tour puts it back when it ends. */
  currentTab: string;
  onShowTab: (tab: string) => void;
};

/** Look-only walkthrough of the owner's profile page (shared GuideTour engine). */
export function ProfileTour({ open, onClose, currentTab, onShowTab }: Props) {
  const startTab = useRef(currentTab);
  useEffect(() => {
    if (open) startTab.current = currentTab;
    // currentTab is read only when the tour opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const steps = useMemo<GuideTourStep[]>(
    () => STEPS.map((s) => ({ ...s, onEnter: STEP_TAB[s.id] ? () => onShowTab(STEP_TAB[s.id]) : undefined })),
    [onShowTab],
  );
  return (
    <GuideTour
      tourId="profile"
      label="ทัวร์แนะนำหน้าโปรไฟล์"
      steps={steps}
      open={open}
      onClose={() => {
        onShowTab(startTab.current);
        onClose();
      }}
    />
  );
}
