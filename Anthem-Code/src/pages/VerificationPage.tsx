import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import VerificationWizard from "@/components/verification/VerificationWizard";

const VerificationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <BackButton />
          <span className="ml-auto text-sm font-medium">ยืนยันตัวตน</span>
          <span className="w-12" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <VerificationWizard />
      </div>
    </div>
  );
};

export default VerificationPage;
