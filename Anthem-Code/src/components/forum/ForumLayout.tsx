import { type ReactNode, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, Plus, Search } from "lucide-react";
import { BRAND_NAME } from "@/lib/brandConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ProfileMenuDropdown } from "@/components/ProfileMenuDropdown";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAuthDialog } from "@/stores/authDialogStore";
import { ForumSidebar } from "@/components/forum/ForumSidebar";
import { useForumCategories } from "@/hooks/useForum";
import { cn } from "@/lib/utils";

const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageFadeTransition = { duration: 0.18, ease: "easeOut" as const };

export function ForumPageHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-6">
      {title ? <h1 className="text-2xl font-bold tracking-tight">{title}</h1> : null}
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

type Props = {
  /** @deprecated prefer nested routes + Outlet; kept for rare direct wrap */
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function ForumLayout({ children, title, subtitle, className }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const openLogin = useAuthDialog((s) => s.openLogin);
  const openSignup = useAuthDialog((s) => s.openSignup);
  const { data: categories = [] } = useForumCategories();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const motionKey = `${location.pathname}${location.search}`;

  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    navigate(`/forum/search?q=${encodeURIComponent(term)}`);
  };

  const goCreate = () => {
    if (!user) {
      openSignup("/forum/new");
      return;
    }
    navigate("/forum/new");
  };

  const body = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-[1044px] items-center gap-3 px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="เมนู">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 pt-10 overflow-y-auto">
              <ForumSidebar categories={categories} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <Link to="/forum" className="shrink-0 font-semibold tracking-tight text-foreground">
            {BRAND_NAME} <span className="text-muted-foreground font-normal">|</span>{" "}
            <span className="text-primary">Community</span>
          </Link>

          <form onSubmit={goSearch} className="hidden sm:flex flex-1 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหากระทู้…"
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
              aria-label="ค้นหา"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" onClick={goCreate} className="gap-1.5 rounded-lg">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">สร้างกระทู้</span>
            </Button>
            {user ? (
              <>
                <NotificationBell />
                <ProfileMenuDropdown
                  variant="forum"
                  trigger={
                    <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <UserAvatar
                        src={(profile as { avatar_url?: string | null } | null)?.avatar_url}
                        name={(profile as { display_name?: string | null } | null)?.display_name}
                        className="h-8 w-8"
                      />
                    </button>
                  }
                />
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => openLogin()}>
                เข้าสู่ระบบ
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className={cn("mx-auto max-w-[1044px] px-4 py-6", className)}>
        {(title || subtitle) && <ForumPageHeader title={title} subtitle={subtitle} />}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <ForumSidebar categories={categories} />
          </div>

          <main className="min-w-0 relative overflow-hidden">
            {reduced ? (
              body
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={motionKey}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageFade}
                  transition={pageFadeTransition}
                  className="min-w-0"
                >
                  {body}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/** Route shell — keeps header/sidebar mounted while child pages slide. */
export default function ForumLayoutRoute() {
  return <ForumLayout />;
}
