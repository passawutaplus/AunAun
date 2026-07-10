import { Compass, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brandConfig";
import { navigateToAuth } from "@/lib/authRedirect";

type Props = {
  creatorName: string;
  isLoggedIn: boolean;
};

const ProfileVisitorExploreSection = ({ creatorName, isLoggedIn }: Props) => {
  const navigate = useNavigate();

  return (
    <section className="mt-8 rounded-2xl sm:rounded-3xl glass-panel p-5 sm:p-6 border border-primary/10">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Compass className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">สำรวจต่อบน {BRAND_NAME}</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              ชอบผลงานของ {creatorName}? ดูดีไซเนอร์และผลงานอื่น ๆ ในฟีด —{" "}
              {isLoggedIn
                ? "ติดตามครีเอเตอร์ที่ชอบหรือส่งคำขอจ้างได้เลย"
                : "สมัครฟรีเพื่อติดต่อ ติดตาม และสร้างพอร์ตของคุณเอง"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-full bg-gradient-brand text-white hover:opacity-90"
              onClick={() => navigate("/?mode=designers")}
            >
              <Users className="w-4 h-4 mr-1.5" />
              ดูดีไซเนอร์
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full glass-panel"
              onClick={() => navigate("/")}
            >
              ดูฟีดผลงาน
            </Button>
            {!isLoggedIn && (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => navigateToAuth(navigate)}
              >
                สมัครฟรี
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileVisitorExploreSection;
