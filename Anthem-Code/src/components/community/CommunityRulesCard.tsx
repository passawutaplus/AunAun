import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { COMMUNITY_GUIDELINES_PATH } from "@/data/communityModerationPolicy";

const CommunityRulesCard = () => (
  <aside className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
    <div className="flex items-start justify-between gap-3">
      <p className="font-medium flex items-center gap-2 min-w-0">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        กฎ Designer Area
      </p>
      <Link
        to={COMMUNITY_GUIDELINES_PATH}
        className="shrink-0 text-xs text-primary hover:underline"
      >
        อ่านฉบับเต็ม
      </Link>
    </div>
    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
      โพสต์สุภาพ ไม่หยาบคาย ไม่ spam ไม่ NSFW เคารพลิขสิทธิ์ — ละเมิดซ้ำอาจโดน strike
      และจำกัดการโพสต์ชั่วคราว
    </p>
  </aside>
);

export default CommunityRulesCard;
