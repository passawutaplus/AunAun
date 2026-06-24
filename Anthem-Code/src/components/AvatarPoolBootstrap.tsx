import { useAssignDefaultAvatar } from "@/hooks/useAssignDefaultAvatar";
import { useAvatarPool } from "@/hooks/useAvatarPool";

/** Loads avatar pool + assigns default avatar for users missing one. */
const AvatarPoolBootstrap = () => {
  useAvatarPool();
  useAssignDefaultAvatar();
  return null;
};

export default AvatarPoolBootstrap;
