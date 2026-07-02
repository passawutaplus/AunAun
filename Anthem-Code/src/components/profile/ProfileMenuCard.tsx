import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Layers3,
  Coins,
  MessageCircle,
  Settings,
  LogOut,
  Plus,
  Building2,
  Flag,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Bookmark,
  UserPlus,
  FolderKanban,
} from "lucide-react";
import { useSubscription } from "@/core/subscription";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import KycStatusBadge from "@/components/verification/KycStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useMyStudios, useSetActiveStudio } from "@/hooks/useStudios";
import ReferralShareSheet from "@/components/referral/ReferralShareSheet";

const ProfileMenuCard = () => {
  const navigate = useNavigate();
  const [referralOpen, setReferralOpen] = useState(false);
  const { data: myStudios = [] } = useMyStudios();
  const setActive = useSetActiveStudio();
  const { isPro } = useSubscription();

  const item =
    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground hover:bg-accent hover:text-foreground transition-colors text-left";

  return (
    <>
    <nav
      aria-label="เมนูโปรไฟล์"
      className="rounded-3xl glass-panel p-3 space-y-0.5"
    >
      <button onClick={() => navigate("/portfolio")} className={item}>
        <LayoutGrid className="w-4 h-4 text-primary" /> โปรไฟล์ของฉัน
      </button>
      <button onClick={() => navigate("/portfolio/manage")} className={item}>
        <FolderKanban className="w-4 h-4 text-primary" /> แดชบอร์ด &amp; จัดการ
      </button>
      <button onClick={() => navigate("/collections")} className={item}>
        <Layers3 className="w-4 h-4 text-primary" /> คอลเลกชันของฉัน
      </button>
      <button
        onClick={() => document.getElementById("saved-posts")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className={item}
      >
        <Bookmark className="w-4 h-4 text-primary" /> โพสต์ที่บันทึก
      </button>
      <button onClick={() => navigate("/earnings")} className={item}>
        <Coins className="w-4 h-4 text-primary" /> รายได้ &amp; กระเป๋า Pixel
      </button>
      <button type="button" onClick={() => setReferralOpen(true)} className={item}>
        <UserPlus className="w-4 h-4 text-primary" /> ชวนเพื่อนรับ Pixel
      </button>
      <button onClick={() => navigate("/chat")} className={item}>
        <MessageCircle className="w-4 h-4 text-primary" /> ข้อความ
      </button>
      <button onClick={() => navigate("/jobs")} className={item}>
        <BriefcaseIcon className="w-4 h-4 text-primary" /> งานจาก Studio
      </button>

      <div className="my-2 border-t border-border" />
      <p className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Studio ของฉัน</p>

      {myStudios.length === 0 ? (
        <button onClick={() => navigate("/studio/new")} className={`${item} text-primary hover:text-primary`}>
          <Plus className="w-4 h-4" /> ก่อตั้ง Studio
        </button>
      ) : (
        <>
          {myStudios.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActive.mutate(s.id); navigate("/studio/manage"); }}
              className={item}
            >
              <Building2 className="w-4 h-4 text-primary" /> {s.name}
            </button>
          ))}
          <button onClick={() => navigate("/studio/new")} className={`${item} text-muted-foreground`}>
            <Plus className="w-4 h-4" /> สร้าง Studio ใหม่
          </button>
        </>
      )}

      <div className="my-2 border-t border-border" />
      <p className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">ระบบ So1o</p>
      {isPro ? (
        <p className="px-3 py-1.5 text-xs text-primary font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> So1o Pro — ใช้ได้ทั้ง Aplus1 และ My Desk
        </p>
      ) : (
        <button onClick={() => navigate("/upgrade")} className={item}>
          <Sparkles className="w-4 h-4 text-primary" /> แพ็กเกจ & อัพเกรด (So1o)
        </button>
      )}

      <div className="my-2 border-t border-border" />
      <KycStatusBadge className="mx-1 mb-1" />
      <button onClick={() => navigate("/verify")} className={item}>
        <ShieldCheck className="w-4 h-4 text-primary" /> เปิดรับรายได้
      </button>
      <button onClick={() => navigate("/settings")} className={item}>
        <Settings className="w-4 h-4 text-primary" /> ตั้งค่า
      </button>
      <div className="grid grid-cols-2 gap-1 px-0.5">
        <button
          onClick={() => navigate("/me/reports")}
          className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs text-foreground hover:bg-accent hover:text-foreground transition-colors text-left"
          title="รายงานของฉัน"
        >
          <Flag className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">รายงาน</span>
        </button>
        <button
          onClick={() => navigate("/me/feedback")}
          className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs text-foreground hover:bg-accent hover:text-foreground transition-colors text-left"
          title="ฟีดแบ็กของฉัน"
        >
          <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">ฟีดแบ็ก</span>
        </button>
      </div>
      <button
        onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
        className={`${item} text-destructive hover:text-destructive`}
      >
        <LogOut className="w-4 h-4" /> ออกจากระบบ
      </button>
    </nav>
      <ReferralShareSheet open={referralOpen} onOpenChange={setReferralOpen} />
    </>
  );
};

export default ProfileMenuCard;
