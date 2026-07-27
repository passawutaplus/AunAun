import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import VerificationWizard from "@/components/verification/VerificationWizard";

const VerificationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 lg:hidden border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <BackButton />
          <span className="ml-auto text-base font-medium">ยืนยันตัวตน</span>
          <span className="w-12" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 text-base">
        <VerificationWizard />
      </div>
    </div>
  );
};

export default VerificationPage;
