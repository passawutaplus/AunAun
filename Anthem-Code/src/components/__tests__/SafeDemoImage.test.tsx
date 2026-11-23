import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SafeDemoImage from "@/components/SafeDemoImage";
import { buildProxyImageUrl } from "@/lib/imageProxy";

const ORIGINAL =
  "https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/u/p/cover.webp";

describe("SafeDemoImage with resized images", () => {
  it("falls back to the original when the resized copy fails, then to the placeholder", () => {
    const proxied = buildProxyImageUrl(ORIGINAL, 640, 75);
    const { container } = render(
      <SafeDemoImage src={proxied} srcSet={`${proxied} 640w`} sizes="50vw" alt="work" reveal={false} />,
    );
    const img = container.querySelector("img")!;
    expect(img.getAttribute("srcset")).toContain("640w");

    fireEvent.error(img);
    expect(img.getAttribute("src")).toBe(ORIGINAL);
    expect(img.getAttribute("srcset")).toBeNull();

    fireEvent.error(img);
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });
});
