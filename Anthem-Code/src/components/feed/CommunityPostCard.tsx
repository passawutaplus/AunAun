import { Link } from "react-router-dom";

import type { CommunityPost } from "@/hooks/useCommunityPosts";

import { formatThaiDate } from "@/lib/format";

import { exploreProjectsUrl } from "@/lib/exploreRoutes";
import { communityCoverUrl } from "@/lib/communityMedia";
import { communityMediaAspectTailwind, normalizeCommunityMediaAspect } from "@/lib/communityMediaAspect";
import { communityDisplayTags } from "@/lib/communityQaTag";
import { CommunityTagLink } from "@/components/community/CommunityTagLink";

import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import { CommunityTextCover } from "@/components/community/CommunityTextCover";

import CommunityPostMenu from "@/components/community/CommunityPostMenu";

import CommunityPostActionBar from "@/components/community/CommunityPostActionBar";
import UserAvatar from "@/components/UserAvatar";

import { profilePublicPath } from "@/lib/profileRoutes";



interface Props {

  post: CommunityPost;

}



const CommunityPostCard = ({ post }: Props) => {

  const cover = communityCoverUrl(post.gallery_urls, post.video_urls);
  const aspectClass = communityMediaAspectTailwind(normalizeCommunityMediaAspect(post.media_aspect));

  const authorPath = profilePublicPath({

    user_id: post.author_id,

    username: post.profile?.username,

  });



  return (

    <article className="rounded-2xl glass-panel overflow-hidden hover:ring-2 hover:ring-primary/15 transition-all">

      <div className="flex items-center gap-3 px-4 pt-4 pb-2">

        <Link to={authorPath} onClick={(e) => e.stopPropagation()} className="shrink-0">

          <UserAvatar

            src={post.profile?.avatar_url}

            name={post.profile?.display_name ?? "?"}

            className="w-9 h-9"

          />

        </Link>

        <div className="flex-1 min-w-0">

          <Link to={authorPath} onClick={(e) => e.stopPropagation()} className="block hover:text-primary">

            <p className="text-sm font-medium truncate">{post.profile?.display_name ?? "ผู้ใช้"}</p>

          </Link>

          <p className="text-[11px] text-muted-foreground">{formatThaiDate(post.created_at)}</p>

        </div>

        <CommunityPostMenu postId={post.id} authorId={post.author_id} title={post.title} />

      </div>



      <Link to={`/community/${post.id}`} className="block">

        {cover ? (
          <div className="relative">
            <CommunityPostMedia
              galleryUrls={post.gallery_urls}
              videoUrls={post.video_urls}
              title={post.title}
              mediaAspect={post.media_aspect}
            />
          </div>
        ) : (
          <CommunityTextCover
            seed={post.id}
            title={post.title}
            body={post.body}
            tags={post.tags}
            themeId={post.text_cover_theme}
            aspectClass={aspectClass}
          />
        )}



        <div className="px-4 py-3 space-y-2">

          <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{post.title}</h3>

          <p className="text-base text-foreground line-clamp-3 whitespace-pre-wrap">{post.body}</p>

          {communityDisplayTags(post.tags).length > 0 && (
            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.preventDefault()}>
              {communityDisplayTags(post.tags).slice(0, 4).map((t) => (
                <CommunityTagLink key={t} tag={t} compact className="text-[10px] text-primary/80" />
              ))}
            </div>
          )}

        </div>

      </Link>



      <CommunityPostActionBar

        postId={post.id}

        authorId={post.author_id}

        title={post.title}

        likeCount={post.like_count}

        replyCount={post.reply_count}

        viewCount={post.view_count}

        compact

      />

    </article>

  );

};



export default CommunityPostCard;

