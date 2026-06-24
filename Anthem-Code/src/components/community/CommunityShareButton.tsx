import SharePopover from "@/components/SharePopover";
import type { ReactNode } from "react";

type Props = {
  postId: string;
  title: string;
  children: ReactNode;
};

const CommunityShareButton = ({ postId, title, children }: Props) => {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/community/${postId}`
      : `/community/${postId}`;

  return (
    <SharePopover url={url} title={title} label="แชร์โพสต์">
      {children}
    </SharePopover>
  );
};

export default CommunityShareButton;
