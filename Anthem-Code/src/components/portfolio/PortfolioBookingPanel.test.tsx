import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import PortfolioBookingPanel from "@/components/portfolio/PortfolioBookingPanel";
import type { BookmarkedPackages } from "@/hooks/useCreatorServiceBookmarks";
import type { PackageFeedCard } from "@/hooks/usePackageFeed";

let saved: BookmarkedPackages = { cards: [], unavailableIds: [], tracking: {} };
const removeMany = vi.fn();

const updateTracking = vi.fn();

vi.mock("@/hooks/useCreatorServiceBookmarks", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useCreatorServiceBookmarks")>("@/hooks/useCreatorServiceBookmarks");
  return {
  ...actual,
  useUpdateBookmarkTracking: () => ({ mutate: updateTracking, isPending: false }),
  useBookmarkedPackages: () => ({ data: saved, isLoading: false, isError: false, refetch: vi.fn() }),
  useToggleCreatorServiceBookmark: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveCreatorServiceBookmarks: () => ({ mutate: removeMany, isPending: false }),
  useSavedCreatorServiceIds: () => ({ data: new Set<string>() }),
  };
});
vi.mock("@/hooks/usePackageFeedStats", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/usePackageFeedStats")>("@/hooks/usePackageFeedStats");
  return { ...actual, usePackageFeedStats: () => ({ data: {} }) };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "me" } }) }));

const card = (id: string, owner: string, price: number): PackageFeedCard =>
  ({
    profile: { user_id: owner, display_name: `Creator ${owner}`, username: owner },
    service: { id, owner_id: owner, title: `Package ${id}`, price_thb: price, price_min_thb: 0 },
    images: [],
    searchHaystack: `package ${id} creator ${owner}`,
  }) as unknown as PackageFeedCard;

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PortfolioBookingPanel userId="me" />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("PortfolioBookingPanel (Packages Saved)", () => {
  beforeEach(() => {
    removeMany.mockClear();
    saved = { cards: [], unavailableIds: [], tracking: {} };
  });

  it("counts packages that are no longer available instead of hiding them", () => {
    saved = { cards: [card("a", "u1", 500)], unavailableIds: ["gone-1", "gone-2"], tracking: {} };
    renderPanel();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Packages Saved3");
    expect(screen.getByText("ไม่เปิดให้ดูแล้ว (2)")).toBeInTheDocument();
  });

  it("clears every unavailable package in one request", () => {
    saved = { cards: [card("a", "u1", 500)], unavailableIds: ["gone-1", "gone-2"], tracking: {} };
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "เอาออกทั้งหมด" }));
    expect(removeMany).toHaveBeenCalledWith(["gone-1", "gone-2"]);
  });

  it("still lists the unavailable ones when nothing else is saved", () => {
    saved = { cards: [], unavailableIds: ["gone-1"], tracking: {} };
    renderPanel();
    expect(screen.getByText("ไม่เปิดให้ดูแล้ว (1)")).toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีแพ็กเกจที่บันทึก")).not.toBeInTheDocument();
  });

  it("shows the empty state only when nothing is saved at all", () => {
    renderPanel();
    expect(screen.getByText("ยังไม่มีแพ็กเกจที่บันทึก")).toBeInTheDocument();
  });

  it("offers price and creator filters from three saved packages up", () => {
    saved = { cards: [card("a", "u1", 500), card("b", "u2", 3000)], unavailableIds: [], tracking: {} };
    const { unmount } = renderPanel();
    expect(screen.queryByLabelText("กรองตามราคา")).not.toBeInTheDocument();
    unmount();

    saved = { cards: [card("a", "u1", 500), card("b", "u2", 3000), card("c", "u2", 9000)], unavailableIds: [], tracking: {} };
    renderPanel();
    expect(screen.getByLabelText("กรองตามราคา")).toBeInTheDocument();
    expect(screen.getByLabelText("กรองตามครีเอเตอร์")).toBeInTheDocument();
  });

  it("keeps a private status per package and can filter by it", () => {
    saved = {
      cards: [card("a", "u1", 500), card("b", "u2", 3000), card("c", "u2", 9000)],
      unavailableIds: [],
      tracking: { b: { status: "hired", note: "ถามเรื่องไฟล์", folder: "งาน A", savedAt: "" } },
    };
    renderPanel();
    expect(screen.getByText("ถามเรื่องไฟล์")).toBeInTheDocument();
    expect(screen.getByLabelText("กรองตามโฟลเดอร์")).toBeInTheDocument();
    expect(screen.getAllByLabelText("สถานะ")).toHaveLength(3);
  });

  it("needs two ticked packages before it can compare", () => {
    saved = { cards: [card("a", "u1", 500), card("b", "u2", 3000)], unavailableIds: [], tracking: {} };
    renderPanel();
    const ticks = screen.getAllByLabelText("เลือกเพื่อเปรียบเทียบ");
    fireEvent.click(ticks[0]);
    expect(screen.getByRole("button", { name: "เปรียบเทียบ" })).toBeDisabled();
    fireEvent.click(ticks[1]);
    expect(screen.getByRole("button", { name: "เปรียบเทียบ" })).toBeEnabled();
  });
});
