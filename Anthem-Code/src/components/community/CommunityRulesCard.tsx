import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import {
  COMMUNITY_CONTENT_RULES,
  COMMUNITY_GUIDELINES_PATH,
  COMMUNITY_STRIKE_LADDER,
  COMMUNITY_STRIKE_RESET_DAYS,
} from "@/data/communityModerationPolicy";

const CommunityRulesCard = () => (
  <aside className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3 text-sm">
    <p className="font-medium flex items-center gap-2">
      <Shield className="w-4 h-4 text-primary" />
      กฎ Designer Area
    </p>
    <ul className="space-y-2 text-xs text-muted-foreground">
      {COMMUNITY_CONTENT_RULES.map((rule) => (
        <li key={rule.id}>
          <span className="font-medium text-foreground">{rule.title}</span>
          <span className="block mt-0.5">{rule.desc}</span>
        </li>
      ))}
    </ul>
    <div className="text-xs text-muted-foreground border-t border-border/50 pt-3 space-y-1">
      <p className="font-medium text-foreground">โทษจากคำหยาบ (strike)</p>
      {COMMUNITY_STRIKE_LADDER.map((row) => (
        <p key={row.strikes}>
          ครั้งที่ {row.strikes}: {row.effect}
          {row.banDays > 0 ? ` ${row.banDays} วัน` : ""}
        </p>
      ))}
      <p className="pt-1">รีเซ็ต strike หลัง {COMMUNITY_STRIKE_RESET_DAYS} วันไม่มีเหตุการณ์ใหม่</p>
    </div>
    <Link to={COMMUNITY_GUIDELINES_PATH} className="text-xs text-primary hover:underline">
      อ่านกฎชุมชนฉบับเต็ม
    </Link>
  </aside>
);

export default CommunityRulesCard;
