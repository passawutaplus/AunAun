import { useState, type PointerEvent, type ReactNode } from "react";
import {
  User,
  LogOut,
  Settings,
  Wallet,
  MessageSquarePlus,
  MessagesSquare,
  Shield,
  BookOpen,
  ArrowLeft,
  Rocket,
  Mail,
  Palette,
  Headset,
  HeartHandshake,
  ChevronDown,
} from "lucide-react";
import ManageWorkIcon from "@/components/icons/ManageWorkIcon";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { signOutApp } from "@/lib/signOutApp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeModePicker } from "@/components/settings/ThemeModePicker";
import { LanguagePicker } from "@/components/settings/LanguagePicker";
import { FeedGridDensityPicker } from "@/components/feed/FeedGridDensityPicker";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { openBrandLineContact } from "@/lib/brandConfig";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { isCommerceEnabled } from "@/lib/aplus1Launch";
import { isSupportSpaceEnabled } from "@/lib/support/flags";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { NAV } from "@/lib/i18n/nav";

function preventClose(e: PointerEvent) {
  e.preventDefault();
}

/** Collapsible group inside the menu: the header toggles without closing the menu. */
function MenuSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onPointerDown={preventClose}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center rounded-lg px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {/* Slides open / shut: grid rows 0fr -> 1fr; invisible when shut so its items leave the tab order. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out motion-reduce:transition-none",
          open ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden pl-6">{children}</div>
      </div>
    </div>
  );
}

type ProfileMenuVariant = "default" | "forum";

type ProfileMenuContentProps = {
  onNavigate?: () => void;
  variant?: ProfileMenuVariant;
};

export function ProfileMenuContent({ onNavigate, variant = "default" }: ProfileMenuContentProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: isAdmin } = useIsAdmin();
  const openFeedback = useOpenFeedbackTicket();
  const t = useT(NAV);
  const isVerified = !!(profile as { is_verified?: boolean } | null)?.is_verified;

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  // Wallet, seller verification and the forum come back with the commerce phase.
  const commerce = isCommerceEnabled();

  const signOut = async () => {
    await signOutApp(queryClient);
    navigate(variant === "forum" ? "/forum" : "/");
    onNavigate?.();
  };

  return (
    <>
      <DropdownMenuItem
        onClick={() => go(variant === "forum" ? "/forum/me" : "/portfolio")}
        className="rounded-lg"
      >
        <User className="w-4 h-4 mr-2" />{" "}
        {variant === "forum" ? t("myCommunityProfile") : t("myProfile")}
      </DropdownMenuItem>
      {variant !== "forum" ? (
        <>
          <DropdownMenuItem onClick={() => go("/dashboard")} className="rounded-lg">
            <ManageWorkIcon className="w-4 h-4 mr-2" /> My Studio
          </DropdownMenuItem>
          {commerce ? (
            <DropdownMenuItem onClick={() => go("/earnings")} className="rounded-lg">
              <Wallet className="w-4 h-4 mr-2" /> {t("myWallet")}
            </DropdownMenuItem>
          ) : null}
        </>
      ) : (
        <>
          <DropdownMenuItem onClick={() => go("/")} className="rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("backToFeed")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/forum")} className="rounded-lg">
            <MessagesSquare className="w-4 h-4 mr-2" /> {t("communityHome")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go("/legal/community")} className="rounded-lg">
            <BookOpen className="w-4 h-4 mr-2" /> {t("communityGuidelines")}
          </DropdownMenuItem>
        </>
      )}
      {variant !== "forum" && !isVerified && commerce ? (
        <DropdownMenuItem onClick={() => go("/verify")} className="rounded-lg">
          <Rocket className="w-4 h-4 mr-2" /> {t("becomeCreator")}
        </DropdownMenuItem>
      ) : null}
      {variant === "forum" && isAdmin ? (
        <DropdownMenuItem onClick={() => go("/forum/admin")} className="rounded-lg">
          <Shield className="w-4 h-4 mr-2" /> {t("forumAdmin")}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <MenuSection icon={<Palette className="w-4 h-4 mr-2" />} title={t("appearance")}>
        <div className="space-y-1 py-1 pr-2" onPointerDown={preventClose}>
          <LanguagePicker label={t("language")} />
          <ThemeModePicker label={t("theme")} />
          {variant !== "forum" ? <FeedGridDensityPicker label={t("gridFeed")} /> : null}
        </div>
      </MenuSection>
      <MenuSection icon={<Headset className="w-4 h-4 mr-2" />} title={t("contact")}>
      <DropdownMenuItem
        onClick={() => {
          onNavigate?.();
          openFeedback();
        }}
        className="rounded-lg"
      >
        <MessageSquarePlus className="w-4 h-4 mr-2" /> {t("sendFeedback")}
      </DropdownMenuItem>
      {variant !== "forum" && commerce ? (
        <DropdownMenuItem
          onClick={() => {
            window.open("/forum", "_blank", "noopener,noreferrer");
            onNavigate?.();
          }}
          className="rounded-lg"
        >
          <MessagesSquare className="w-4 h-4 mr-2" /> {t("community")}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem
        onClick={() => {
          onNavigate?.();
          if (!openBrandLineContact()) {
            toast.message(t("lineSoon"));
          }
        }}
        className="rounded-lg"
      >
        <LineMarkIcon className="w-4 h-4 mr-2" /> {t("contactLine")}
      </DropdownMenuItem>
      {variant !== "forum" ? (
        <DropdownMenuItem onClick={() => go("/learn#contact")} className="rounded-lg">
          <Mail className="w-4 h-4 mr-2" /> {t("getInTouch")}
        </DropdownMenuItem>
      ) : null}
      </MenuSection>
      <DropdownMenuSeparator />
      {isSupportSpaceEnabled() ? (
        <DropdownMenuItem onClick={() => go("/support")} className="rounded-lg">
          <HeartHandshake className="w-4 h-4 mr-2" /> Support us
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={() => go("/settings")} className="rounded-lg">
        <Settings className="w-4 h-4 mr-2" /> {t("settings")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => void signOut()} className="rounded-lg text-destructive focus:text-destructive">
        <LogOut className="w-4 h-4 mr-2" /> {t("logOut")}
      </DropdownMenuItem>
    </>
  );
}

type ProfileMenuDropdownProps = {
  trigger: ReactNode;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  onOpenChange?: (open: boolean) => void;
  variant?: ProfileMenuVariant;
};

export function ProfileMenuDropdown({
  trigger,
  contentClassName,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  onOpenChange,
  variant = "default",
}: ProfileMenuDropdownProps) {
  return (
    // modal=false: avoid body scroll-lock layout jump that makes the top nav kick upward
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn("w-60 rounded-xl glass-panel-strong", contentClassName)}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <ProfileMenuContent variant={variant} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
