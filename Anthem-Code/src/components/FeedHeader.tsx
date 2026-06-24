import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_NAME } from "@/lib/brandConfig";
import { useAuth } from "@/hooks/useAuth";

interface FeedHeaderProps {
  onMyPortClick: () => void;
}

const FeedHeader = ({ onMyPortClick: _ }: FeedHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5" aria-label={`${BRAND_NAME} หน้าแรก`}>
          <BrandLogo />
        </button>

        {!user && (
          <Button
            onClick={() => navigate("/auth")}
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <LogIn className="w-4 h-4 mr-1" /> เข้าสู่ระบบ
          </Button>
        )}
      </div>
    </div>
  );
};

export default FeedHeader;
