import { useAssignDefaultAvatar } from "@/hooks/useAssignDefaultAvatar";
import { useAvatarPool } from "@/hooks/useAvatarPool";

/** Loads guest avatar pool. Signed-in default is initials via UserAvatar. */
const AvatarPoolBootstrap = () => {
  useAvatarPool();
  useAssignDefaultAvatar();
  return null;
};

export default AvatarPoolBootstrap;
