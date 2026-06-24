import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayInitial, getGuestAvatarUrl, getAvatarPoolUrls } from "@/lib/avatarPool";
import { useAvatarPool } from "@/hooks/useAvatarPool";

type Props = {
  src?: string | null;
  name?: string | null;
  /** Use sessionStorage-backed pool avatar when src is missing. */
  guest?: boolean;
  className?: string;
  fallbackClassName?: string;
};

const UserAvatar = ({ src, name, guest, className, fallbackClassName }: Props) => {
  useAvatarPool();

  const trimmed = src?.trim();
  const pool = getAvatarPoolUrls();
  const resolved =
    trimmed ||
    (guest ? getGuestAvatarUrl(pool) : null) ||
    null;

  const initial = displayInitial(name);

  return (
    <Avatar className={className}>
      {resolved ? (
        <AvatarImage src={resolved} alt={name ? `${name} avatar` : "avatar"} />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-brand text-white text-sm font-medium",
          fallbackClassName,
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
