import { describe, expect, it } from "vitest";
import {
  assertPublicUrl,
  eventJsonLd,
  metaContent,
  pageLinks,
  pageText,
  pickPageLink,
} from "../../../supabase/functions/_shared/event-page";

describe("pageLinks / pickPageLink", () => {
  const html = `
    <a href="/about">About us</a>
    <a href="https://www.facebook.com/sharer?u=x">Share</a>
    <a class="btn" href="https://www.eventbrite.com/e/abc-123?aff=site">Get Tickets</a>
    <a href="forms/apply#top">สมัครเข้าร่วม</a>
    <a href="javascript:void(0)">x</a>
    <a href="mailto:hi@example.com">mail</a>`;
  const links = pageLinks(html, "https://galleryabc.com/exhibition/abc");

  it("resolves relative links, drops non-http, and puts action buttons first", () => {
    expect(links.map((l) => l.url)).toEqual([
      "https://www.eventbrite.com/e/abc-123?aff=site",
      "https://galleryabc.com/exhibition/forms/apply",
      "https://galleryabc.com/about",
      "https://www.facebook.com/sharer?u=x",
    ]);
  });

  it("accepts only links that are on the page", () => {
    expect(pickPageLink("https://www.eventbrite.com/e/abc-123?aff=site", links)).toBe(
      "https://www.eventbrite.com/e/abc-123?aff=site",
    );
    expect(pickPageLink("https://galleryabc.com/exhibition/forms/apply/", links)).toBe(
      "https://galleryabc.com/exhibition/forms/apply",
    );
    expect(pickPageLink("https://www.eventbrite.com/e/abc-999", links)).toBeNull();
    expect(pickPageLink(null, links)).toBeNull();
  });
});

describe("assertPublicUrl", () => {
  it("accepts public http(s) pages", () => {
    expect(assertPublicUrl("https://www.bacc.or.th/event/1").hostname).toBe("www.bacc.or.th");
    expect(assertPublicUrl("http://gallery.example.com/show").protocol).toBe("http:");
  });

  it.each([
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://localhost:8080/",
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://192.168.1.1/",
    "http://172.16.0.5/",
    "http://169.254.169.254/latest/meta-data",
    "http://100.64.0.1/",
    "http://[::1]/",
    "http://intranet/",
    "http://db.internal/",
    "https://user:pass@example.com/",
    "https://example.com:8443/",
  ])("refuses %s", (url) => {
    expect(() => assertPublicUrl(url)).toThrow();
  });
});

describe("eventJsonLd", () => {
  it("finds Event objects, also inside @graph and arrays", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization","name":"x"}</script>
      <script type="application/ld+json">{"@graph":[{"@type":"ExhibitionEvent","name":"Show"}]}</script>
      <script type="application/ld+json">[{"@type":["Event"],"name":"Talk"}]</script>
      <script type="application/ld+json">{ broken </script>`;
    expect(eventJsonLd(html).map((e) => e.name)).toEqual(["Show", "Talk"]);
  });
});

describe("page helpers", () => {
  it("reads meta tags in either attribute order", () => {
    expect(metaContent('<meta property="og:title" content="Creative Visions">', "og:title")).toBe(
      "Creative Visions",
    );
    expect(metaContent('<meta content="BACC" property="og:site_name">', "og:site_name")).toBe(
      "BACC",
    );
    expect(metaContent("<p>none</p>", "og:title")).toBeNull();
  });

  it("keeps readable text and drops scripts and styles", () => {
    const t = pageText(
      "<style>.a{}</style><h1>Creative&nbsp;Visions</h1><script>evil()</script><p>Free admission</p>",
    );
    expect(t).toContain("Creative Visions");
    expect(t).toContain("Free admission");
    expect(t).not.toContain("evil");
  });
});
