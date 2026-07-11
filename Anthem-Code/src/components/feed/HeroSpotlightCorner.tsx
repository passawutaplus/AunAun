import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { displayInitial } from "@/lib/avatarPool";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl: string | null;
  profileHref: string;
  variant?: "designer" | "studio";
  className?: string;
};

const HeroSpotlightCorner = ({
  name,
  avatarUrl,
  profileHref,
  variant = "designer",
  className,
}: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "absolute top-4 right-4 sm:top-6 sm:right-6 z-10 pointer-events-none",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => navigate(profileHref)}
        aria-label={variant === "studio" ? `ดูสตูดิโอ ${name}` : `ดูโปรไฟล์ ${name}`}
        className="pointer-events-auto rounded-2xl ring-2 ring-white/90 shadow-lg overflow-hidden focus-visible:outline-none focus-visible:ring-primary transition-transform hover:scale-[1.03]"
      >
        {variant === "studio" ? (
          <span className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center bg-gradient-brand text-white">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6" aria-hidden />
            )}
          </span>
        ) : avatarUrl ? (
          <UserAvatar
            src={avatarUrl}
            name={name}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl"
            fallbackClassName="rounded-2xl text-base"
          />
        ) : (
          <span
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center bg-gradient-brand text-white text-base font-medium"
            aria-hidden
          >
            {displayInitial(name)}
          </span>
        )}
      </button>
    </div>
  );
};

export default HeroSpotlightCorner;
