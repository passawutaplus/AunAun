import { describe, expect, it } from "vitest";
import {
  assertPublicAddress,
  assertPublicUrl,
  eventJsonLd,
  isPrivateIp,
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

describe("isPrivateIp", () => {
  it("flags loopback, RFC1918, link-local/metadata, CGNAT, multicast and unspecified", () => {
    for (const ip of [
      "127.0.0.1",
      "127.255.255.254",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "255.255.255.255",
      "::1",
      "::",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "ff02::1",
      "::ffff:127.0.0.1",
      "::ffff:10.0.0.5",
      "::ffff:7f00:1",
      "2002:7f00:0001::", // 6to4 of 127.0.0.1
      "64:ff9b::a00:1",
      "2001:0:abcd::1", // Teredo
      "[::1]",
      "garbage",
    ]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("accepts public addresses", () => {
    for (const ip of [
      "8.8.8.8",
      "1.1.1.1",
      "172.32.0.1",
      "100.128.0.1",
      "2606:4700::1111",
      "::ffff:8.8.8.8",
    ]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
});

describe("assertPublicAddress", () => {
  const u = (s: string) => new URL(s);

  it("passes a hostname whose every answer is public", async () => {
    const url = await assertPublicAddress(u("https://www.bacc.or.th/x"), async () => [
      "203.0.113.5",
      "2606:4700::1",
    ]);
    expect(url.hostname).toBe("www.bacc.or.th");
  });

  it("rejects when any answer is private (rebinding / split answers) or nothing resolves", async () => {
    await expect(
      assertPublicAddress(u("https://evil.example.com/"), async () => ["203.0.113.5", "127.0.0.1"]),
    ).rejects.toThrow();
    await expect(
      assertPublicAddress(u("https://meta.example.com/"), async () => ["169.254.169.254"]),
    ).rejects.toThrow();
    await expect(
      assertPublicAddress(u("https://nx.example.com/"), async () => []),
    ).rejects.toThrow();
    await expect(
      assertPublicAddress(u("https://down.example.com/"), async () => {
        throw new Error("dns");
      }),
    ).rejects.toThrow();
  });

  it("lets a public IPv4 literal through without a DNS lookup", async () => {
    const url = await assertPublicAddress(u("http://203.0.113.5/x"), async () => {
      throw new Error("must not resolve");
    });
    expect(url.hostname).toBe("203.0.113.5");
  });

  it("rejects private IP literals before resolving", async () => {
    let resolved = false;
    await expect(
      assertPublicAddress(u("http://10.1.2.3/"), async () => {
        resolved = true;
        return [];
      }),
    ).rejects.toThrow();
    expect(resolved).toBe(false);
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
