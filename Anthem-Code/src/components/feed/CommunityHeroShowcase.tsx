import { useNavigate } from "react-router-dom";
import { useCommunityHeroPost, communityHeroCover } from "@/hooks/useCommunityHeroPost";

/** Area hero — single image from the most engaging community post. */
const CommunityHeroShowcase = () => {
  const navigate = useNavigate();
  const { data: post } = useCommunityHeroPost();
  const cover = communityHeroCover(post);

  if (!cover || !post) {
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-muted/40 to-muted/60 animate-pulse"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/community/${post.id}`)}
      aria-label={`ดูโพสต์: ${post.title}`}
      className="absolute inset-0 z-0 bg-muted cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <img
        src={cover}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_30%] md:object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
      <span className="absolute bottom-20 right-4 hidden md:flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none max-w-[14rem] truncate">
        {post.title}
      </span>
    </button>
  );
};

export default CommunityHeroShowcase;
