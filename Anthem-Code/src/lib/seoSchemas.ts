import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export type BreadcrumbItem = { name: string; path: string };

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "th",
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    logo: absoluteUrl("/icons/icon-512.png"),
    sameAs: [] as string[],
  };
}

export function personJsonLd(opts: {
  name: string;
  description?: string;
  image?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
    description: opts.description || undefined,
    image: opts.image || undefined,
    url: opts.url,
  };
}

export function profilePageJsonLd(opts: {
  name: string;
  description?: string;
  image?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: opts.name,
    description: opts.description || undefined,
    url: opts.url,
    mainEntity: personJsonLd(opts),
  };
}

export function creativeWorkJsonLd(opts: {
  name: string;
  description?: string;
  image?: string;
  authorName: string;
  authorUrl?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: opts.name,
    description: opts.description || undefined,
    image: opts.image || undefined,
    author: {
      "@type": "Person",
      name: opts.authorName,
      ...(opts.authorUrl ? { url: opts.authorUrl } : {}),
    },
    url: opts.url,
    inLanguage: "th",
  };
}

const EMP_MAP: Record<string, string> = {
  project: "CONTRACTOR",
  fulltime: "FULL_TIME",
  parttime: "PART_TIME",
  internship: "INTERN",
  freelance: "CONTRACTOR",
};

export function jobPostingJsonLd(job: {
  id: string;
  title: string;
  description?: string | null;
  created_at?: string | null;
  deadline?: string | null;
  employment_type?: string | null;
  location_type?: "remote" | "onsite" | "hybrid" | string | null;
  location?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  status?: string | null;
  cover_image_url?: string | null;
  poster?: { display_name?: string | null; username?: string | null } | null;
  studio?: { name?: string | null; slug?: string | null } | null;
}) {
  const url = absoluteUrl(`/jobs/${job.id}`);
  const orgName =
    job.studio?.name ||
    job.poster?.display_name ||
    job.poster?.username ||
    SITE_NAME;
  const isRemote = job.location_type === "remote";

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    datePosted: job.created_at || undefined,
    validThrough: job.deadline || undefined,
    employmentType: EMP_MAP[job.employment_type ?? ""] || "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: orgName,
      ...(job.studio?.slug ? { url: absoluteUrl(`/s/${job.studio.slug}`) } : {}),
    },
    url,
    image: job.cover_image_url || undefined,
    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: job.id,
    },
  };

  if (isRemote) {
    base.jobLocationType = "TELECOMMUTE";
    base.applicantLocationRequirements = {
      "@type": "Country",
      name: "TH",
    };
  } else {
    base.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location || "Thailand",
        addressCountry: "TH",
      },
    };
  }

  if (job.budget_min != null || job.budget_max != null) {
    base.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "THB",
      value: {
        "@type": "QuantitativeValue",
        ...(job.budget_min != null ? { minValue: job.budget_min } : {}),
        ...(job.budget_max != null ? { maxValue: job.budget_max } : {}),
        unitText: "ONE_TIME",
      },
    };
  }

  return base;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  description?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description || undefined,
    url: opts.url,
    inLanguage: "th",
  };
}
