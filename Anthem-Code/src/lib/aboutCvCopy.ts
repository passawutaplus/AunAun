import type { CvDocLang, CvMilitaryStatus } from "@/lib/profileCv";
import type { CvContactKind, CvSectionKey } from "@/lib/aboutCvModel";

/**
 * Words printed on the CV itself. `cv.docLang` picks the set, independent of the
 * editor's own TH/EN toggle (a Thai owner can still send an English CV).
 */
export type CvDocCopy = {
  present: string;
  /** Block headings in the sidebar / header band. */
  blocks: {
    contact: string;
    location: string;
    personal: string;
    languages: string;
    skills: string;
    software: string;
    links: string;
  };
  sections: Record<CvSectionKey, string>;
  contact: Record<CvContactKind, string>;
  personal: { birthDate: string; nationality: string; military: string; age: (n: number) => string };
  military: Record<CvMilitaryStatus, string>;
};

export const CV_DOC_COPY: Record<CvDocLang, CvDocCopy> = {
  en: {
    present: "Present",
    blocks: {
      contact: "Contact",
      location: "Location",
      personal: "Personal Details",
      languages: "Languages",
      skills: "Skills",
      software: "Design Software",
      links: "Portfolio",
    },
    sections: {
      experience: "Experience",
      projects: "Selected Work",
      education: "Education",
      certification: "Certification",
      awards: "Awards",
      references: "References",
    },
    contact: {
      profile: "SAMECOR",
      portfolio: "Portfolio",
      email: "Email",
      phone: "Phone",
      line: "LINE",
      website: "Website",
      instagram: "Instagram",
      facebook: "Facebook",
      social: "Link",
    },
    personal: {
      birthDate: "Date of birth",
      nationality: "Nationality",
      military: "Military service",
      age: (n) => `${n} yrs`,
    },
    military: {
      completed: "Completed",
      exempt: "Exempt",
      not_required: "Not applicable",
    },
  },
  th: {
    present: "ปัจจุบัน",
    blocks: {
      contact: "ติดต่อ",
      location: "ที่อยู่",
      personal: "ข้อมูลส่วนตัว",
      languages: "ภาษา",
      skills: "ทักษะ",
      software: "โปรแกรมที่ใช้",
      links: "พอร์ตโฟลิโอ",
    },
    sections: {
      experience: "ประสบการณ์ทำงาน",
      projects: "ผลงานเด่น",
      education: "การศึกษา",
      certification: "ใบรับรอง",
      awards: "รางวัล",
      references: "บุคคลอ้างอิง",
    },
    contact: {
      profile: "SAMECOR",
      portfolio: "พอร์ตโฟลิโอ",
      email: "อีเมล",
      phone: "โทรศัพท์",
      line: "LINE",
      website: "เว็บไซต์",
      instagram: "Instagram",
      facebook: "Facebook",
      social: "ลิงก์",
    },
    personal: {
      birthDate: "วันเกิด",
      nationality: "สัญชาติ",
      military: "สถานะทางทหาร",
      age: (n) => `${n} ปี`,
    },
    military: {
      completed: "ผ่านการเกณฑ์ทหารแล้ว",
      exempt: "ได้รับการยกเว้น",
      not_required: "ไม่เข้าข่ายต้องเกณฑ์ทหาร",
    },
  },
};
