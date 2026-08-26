import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import VerificationWizard from "@/components/verification/VerificationWizard";

const VerificationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-app-ambient">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,hsl(var(--primary)/0.32),transparent_58%)] dark:bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,hsl(var(--primary)/0.22),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_100%_8%,hsl(18_100%_62%/0.2),transparent_52%)] dark:bg-[radial-gradient(ellipse_55%_40%_at_100%_8%,hsl(18_100%_62%/0.14),transparent_52%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_32%_at_0%_18%,hsl(14_100%_55%/0.14),transparent_48%)] dark:bg-[radial-gradient(ellipse_45%_32%_at_0%_18%,hsl(14_100%_55%/0.1),transparent_48%)]" />
      </div>

      <div className="relative z-20 sticky top-0 lg:hidden border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <BackButton />
          <span className="ml-auto text-base font-medium">ยืนยันตัวตน</span>
          <span className="w-12" />
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 text-base">
        <VerificationWizard />
      </div>
    </div>
  );
};

export default VerificationPage;
