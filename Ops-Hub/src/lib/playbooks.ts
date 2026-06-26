export type Playbook = {
  id: string;
  title: string;
  symptom: string;
  steps: string[];
  runbookHref?: string;
};

export const ECOSYSTEM_PLAYBOOKS: Playbook[] = [
  {
    id: "an1hem-502",
    title: "an1hem 502 แต่ So1o OK",
    symptom: "an1hem.app ไม่เปิด แต่ solofreelancer.com ปกติ",
    steps: [
      "docker compose logs anthem",
      "docker compose up -d --no-deps anthem",
      "ตรวจ /monitor → Site health",
    ],
  },
  {
    id: "supabase-auth",
    title: "ทุกแอป login ไม่ได้",
    symptom: "Auth error ทั้ง 3 โดเมน",
    steps: [
      "รัน scripts/health-check.sh",
      "ตรวจ Supabase Auth redirect URLs",
      "ตรวจ VITE_SUPABASE_* env ทุกแอป",
    ],
  },
  {
    id: "hub-degraded",
    title: "Hub ตัวเลข 0 / banner เหลือง",
    symptom: "SourceDegradedBanner บาง query fail",
    steps: [
      "ดู degradedSources ใน Overview",
      "ตรวจ expose ops schema + RLS",
      "Ops-Hub/scripts/check-db-status.mjs",
    ],
  },
  {
    id: "flywheel-stuck",
    title: "Cross-link conversion ต่ำ",
    symptom: "Connections แสดง stuck >48h สูง",
    steps: [
      "เปิด /connections ดู flow ที่ conversion ต่ำ",
      "ทดสอบ handoff Aplus1→So1o quotation",
      "ทดสอบ PostToAnthemBanner จาก Job Tracker",
    ],
    runbookHref: "/connections",
  },
  {
    id: "migration-gate",
    title: "Migration ค้างก่อน deploy",
    symptom: "Production deploy blocked",
    steps: [
      "./scripts/check-migrations-pending.sh",
      "cd Solo-Code && ./scripts/supabase-push-via-api.sh",
      "deploy หลัง migration สำเร็จ",
    ],
  },
];
