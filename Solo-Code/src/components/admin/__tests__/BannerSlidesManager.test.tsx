import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type Call = { table: string; op: string; payload?: unknown; eq?: [string, unknown] };
const calls: Call[] = [];
let rowsByTable: Record<string, unknown[]> = {};

vi.mock("@/integrations/supabase/client", () => {
  function from(table: string) {
    const call: Call = { table, op: "select" };
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => Promise.resolve({ data: rowsByTable[table] ?? [], error: null }),
      update: (payload: unknown) => {
        call.op = "update";
        call.payload = payload;
        return builder;
      },
      insert: (payload: unknown) => {
        calls.push({ table, op: "insert", payload });
        return Promise.resolve({ error: null });
      },
      delete: () => {
        call.op = "delete";
        return builder;
      },
      eq: (col: string, val: unknown) => {
        call.eq = [col, val];
        calls.push({ ...call });
        return Promise.resolve({ error: null });
      },
    };
    return builder;
  }
  return { supabase: { from } };
});

vi.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/lib/imageCompress", () => ({ uploadCompressedImage: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { BannerSlidesManager, type BannerSlidesConfig } from "../BannerSlidesManager";

const base: BannerSlidesConfig = {
  table: "dashboard_banner_slides",
  bucket: "dashboard-banners",
  adminQueryKey: "admin_dashboard_banner_slides",
  publicQueryKey: "dashboard_banner_slides",
  heading: "แบนเนอร์ทดสอบ",
  description: "desc",
  gridClass: "lg:grid-cols-2",
  thumbWidthClass: "w-28",
  withLink: true,
  imageLabel: "img",
  dialogImageClass: "aspect-[16/5]",
  subtitlePlaceholder: "s",
  titlePlaceholder: "t",
  activeHint: "hint",
};

const rows = [
  {
    id: "a",
    title: "First",
    subtitle: null,
    image_url: "https://x/a.png",
    sort_order: 0,
    is_active: true,
    link_url: "https://example.com/a",
  },
  {
    id: "b",
    title: "Second",
    subtitle: null,
    image_url: "https://x/b.png",
    sort_order: 1,
    is_active: false,
    link_url: null,
  },
];

function renderIt(config: BannerSlidesConfig) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <BannerSlidesManager config={config} preview={<div>preview-slot</div>} />
    </QueryClientProvider>,
  );
  return { spy };
}

beforeEach(() => {
  calls.length = 0;
  rowsByTable = { dashboard_banner_slides: rows, auth_banner_slides: rows };
  vi.restoreAllMocks();
});

describe("BannerSlidesManager", () => {
  it("lists slides, shows the link only when withLink, and renders the preview slot", async () => {
    renderIt(base);
    expect(await screen.findByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("→ https://example.com/a")).toBeInTheDocument();
    expect(screen.getByText("preview-slot")).toBeInTheDocument();
    expect(screen.getByText("ปิดอยู่")).toBeInTheDocument();
  });

  it("hides the link line when withLink is false", async () => {
    renderIt({ ...base, table: "auth_banner_slides", withLink: false });
    await screen.findByText("First");
    expect(screen.queryByText("→ https://example.com/a")).not.toBeInTheDocument();
  });

  it("moving a slide swaps both sort_orders in one go and refreshes admin + public caches", async () => {
    const { spy } = renderIt(base);
    await screen.findByText("First");
    fireEvent.click(screen.getAllByLabelText("เลื่อนลง")[0]);

    await waitFor(() => expect(calls.filter((c) => c.op === "update")).toHaveLength(2));
    const updates = calls.filter((c) => c.op === "update");
    expect(updates).toContainEqual(
      expect.objectContaining({ payload: { sort_order: 1 }, eq: ["id", "a"] }),
    );
    expect(updates).toContainEqual(
      expect.objectContaining({ payload: { sort_order: 0 }, eq: ["id", "b"] }),
    );
    await waitFor(() => {
      const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
      expect(keys).toContain(JSON.stringify(["admin_dashboard_banner_slides"]));
      expect(keys).toContain(JSON.stringify(["dashboard_banner_slides"]));
    });
    // exactly one pair of invalidations (not one per update)
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("disables moving the first slide up and the last slide down", async () => {
    renderIt(base);
    await screen.findByText("First");
    expect(screen.getAllByLabelText("เลื่อนขึ้น")[0]).toBeDisabled();
    expect(screen.getAllByLabelText("เลื่อนลง")[1]).toBeDisabled();
  });

  it("toggle flips is_active for that slide", async () => {
    renderIt(base);
    await screen.findByText("Second");
    fireEvent.click(screen.getByLabelText("เปิดสไลด์")); // slide b is inactive
    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({ op: "update", payload: { is_active: true }, eq: ["id", "b"] }),
      ),
    );
  });

  it("delete asks for confirmation and only then deletes", async () => {
    renderIt(base);
    await screen.findByText("First");

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getAllByLabelText("ลบสไลด์")[0]);
    expect(confirmSpy).toHaveBeenCalled();
    expect(calls.some((c) => c.op === "delete")).toBe(false);

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getAllByLabelText("ลบสไลด์")[0]);
    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({ op: "delete", table: "dashboard_banner_slides", eq: ["id", "a"] }),
      ),
    );
  });
});
