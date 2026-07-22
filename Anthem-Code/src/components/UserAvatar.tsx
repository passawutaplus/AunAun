import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayInitials, getGuestAvatarUrl, getAvatarPoolUrls } from "@/lib/avatarPool";
import { useAvatarPool } from "@/hooks/useAvatarPool";

type Props = {
  src?: string | null;
  /** Display name — used for alt text and as initials fallback. */
  name?: string | null;
  /** Prefer username for the 2-letter default when present. */
  username?: string | null;
  /** Use sessionStorage-backed pool avatar when src is missing. */
  guest?: boolean;
  className?: string;
  fallbackClassName?: string;
};

const UserAvatar = ({ src, name, username, guest, className, fallbackClassName }: Props) => {
  useAvatarPool();

  const trimmed = src?.trim();
  // Only use a real photo URL. Empty / missing → orange-gradient initials default.
  const resolved = trimmed || (guest ? getGuestAvatarUrl(getAvatarPoolUrls()) : null) || null;
  const initials = displayInitials(username || name, 2);
  const label = name || username;

  return (
    <Avatar className={className}>
      {resolved ? (
        <AvatarImage src={resolved} alt={label ? `${label} avatar` : "avatar"} />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-brand text-white text-[0.65em] font-semibold tracking-tight select-none",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
