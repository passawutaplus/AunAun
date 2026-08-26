import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import {
  PROFILE_DESIGNER_SELECT,
  PROFILE_DESIGNER_SELECT_NO_ACTIVE,
} from "@/lib/dbSelects";
import {
  CREATOR_SERVICES_SELECT,
  asCreatorServiceRows,
  fromCreatorServices,
} from "@/lib/creatorServicesDb";
import { displayProfileAddress } from "@/lib/profileAddress";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isOptionalQueryError, isSchemaMismatchError } from "@/lib/supabaseErrors";
import { isVideoUrl } from "@/lib/videoAccept";
import {
  mapCreatorServiceRow,
  servicePreviewUrls,
  type CreatorService,
} from "@/hooks/useCreatorServices";

export type PackageFeedCard = {
  profile: Tables<"profiles">;
  service: CreatorService;
  images: string[];
  searchHaystack: string;
};

const LISTING_CAP = 400;
const GALLERY_CAP = 5;

function profileUserId(p: { user_id?: string; id?: string }) {
  return p.user_id ?? p.id;
}

export function assemblePackageFeedCards(
  services: CreatorService[],
  profiles: Tables<"profiles">[],
): PackageFeedCard[] {
  const profileById = new Map<string, Tables<"profiles">>();
  for (const p of profiles) {
    const pid = profileUserId(p as { user_id?: string; id?: string });
    profileById.set(pid, p);
  }

  return services.flatMap((service) => {
    const profile = profileById.get(service.owner_id);
    if (!profile) return [];
    const place = displayProfileAddress(
      (profile as { profile_address?: unknown }).profile_address,
      (profile as { location?: string | null }).location,
      "short",
    );
    const haystack = [
      service.title,
      service.summary,
      service.category,
      service.tags.join(" "),
      profile.display_name ?? "",
      profile.username ?? "",
      profile.role ?? "",
      place,
    ]
      .join(" ")
      .toLowerCase();
    return [
      {
        profile,
        service,
        images: servicePreviewUrls(service)
          .filter((url) => !isVideoUrl(url))
          .slice(0, GALLERY_CAP),
        searchHaystack: haystack,
      },
    ];
  });
}

export async function fetchProfilesByOwnerIds(ownerIds: string[]): Promise<Tables<"profiles">[]> {
  if (!ownerIds.length) return [];
  let { data: profiles, error } = await profilesPublicFrom()
    .select(PROFILE_DESIGNER_SELECT)
    .in("user_id", ownerIds);
  if (error && (isSchemaMismatchError(error) || isOptionalQueryError(error))) {
    const retry = await profilesPublicFrom()
      .select(PROFILE_DESIGNER_SELECT_NO_ACTIVE)
      .in("user_id", ownerIds);
    profiles = retry.data;
    error = retry.error;
  }
  if (error) {
    const fallback = await profilesPublicFrom()
      .select(PROFILE_DESIGNER_SELECT_NO_ACTIVE)
      .in("id", ownerIds);
    profiles = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;
  return (profiles ?? []) as Tables<"profiles">[];
}

export const usePackageFeed = () =>
  useQuery({
    queryKey: ["package-feed", "listing", "v4"],
    queryFn: async (): Promise<PackageFeedCard[]> => {
      const { data: serviceRows, error: serviceError } = await fromCreatorServices()
        .select(CREATOR_SERVICES_SELECT)
        .eq("status", "Published")
        .order("updated_at", { ascending: false })
        .limit(LISTING_CAP);

      if (serviceError) {
        if (isOptionalQueryError(serviceError) || isSchemaMismatchError(serviceError)) {
          return [];
        }
        throw serviceError;
      }

      const published = asCreatorServiceRows(serviceRows).map(mapCreatorServiceRow);
      if (!published.length) return [];

      const ownerIds = [...new Set(published.map((s) => s.owner_id).filter(Boolean))];
      const profiles = await fetchProfilesByOwnerIds(ownerIds);
      return assemblePackageFeedCards(published, profiles);
    },
  });
