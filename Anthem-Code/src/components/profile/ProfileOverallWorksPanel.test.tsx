import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileOverallWorksPanel from "@/components/profile/ProfileOverallWorksPanel";
import type { DBProject } from "@/hooks/useProjects";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/usePortfolioOrder", () => ({
  usePortfolioOrder: () => ({ reorder: { mutate: vi.fn(), isPending: false } }),
}));
vi.mock("@/components/profile/ProfileOverallWorkMenu", () => ({ ProfileOverallWorkMenu: () => null }));

const project = (over: Partial<DBProject> & { id: string }): DBProject =>
  ({
    title: over.id,
    status: "Published",
    views: 0,
    likes: 0,
    is_pinned: false,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    cover_url: "",
    gallery_urls: [],
    ...over,
  }) as unknown as DBProject;

const renderPanel = (projects: DBProject[]) =>
  render(
    <MemoryRouter>
      <ProfileOverallWorksPanel projects={projects} />
    </MemoryRouter>,
  );

describe("ProfileOverallWorksPanel", () => {
  it("lists works in the portfolio order visitors see: pinned first, with a numbered pin badge", () => {
    renderPanel([
      project({ id: "newest", created_at: "2026-03-01T00:00:00Z", sort_order: 2 }),
      project({ id: "pinned-b", is_pinned: true, sort_order: 5, created_at: "2026-01-01T00:00:00Z" }),
      project({ id: "pinned-a", is_pinned: true, sort_order: 1, created_at: "2026-02-01T00:00:00Z" }),
    ]);
    // Two masonry columns read left to right: [pinned-a | pinned-b] over [newest], so the DOM is column by column.
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["pinned-a", "newest", "pinned-b"]);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("totals views and likes of published works only", () => {
    renderPanel([
      project({ id: "a", views: 10, likes: 2 }),
      project({ id: "b", views: 5, likes: 1 }),
      project({ id: "draft", status: "Draft", views: 999, likes: 999 }),
    ]);
    expect(screen.getByText("ยอดดูรวม").nextSibling).toHaveTextContent("15");
    expect(screen.getByText("ไลก์รวม").nextSibling).toHaveTextContent("3");
  });

  it("hides the status chips when every work is published", () => {
    renderPanel([project({ id: "a" }), project({ id: "b" })]);
    expect(screen.queryByRole("group", { name: "สถานะผลงาน" })).not.toBeInTheDocument();
  });

  it("shows drafts behind a chip and opens them in the editor", () => {
    renderPanel([project({ id: "live" }), project({ id: "wip", status: "Draft", title: "WIP piece" })]);
    expect(screen.queryByText("WIP piece")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /แบบร่าง/ }));
    const link = screen.getAllByRole("link").find((a) => a.getAttribute("href") === "/portfolio/wip/edit");
    expect(link).toBeTruthy();
    expect(screen.getByText("WIP piece")).toBeInTheDocument();
    // Drafts have no public stats and cannot be reordered.
    expect(screen.queryByRole("button", { name: /จัดลำดับ/ })).not.toBeInTheDocument();
  });

  it("starts on drafts when nothing is published yet", () => {
    renderPanel([project({ id: "wip", status: "Draft", title: "WIP piece" })]);
    expect(screen.getByText("WIP piece")).toBeInTheDocument();
  });

  it("offers reordering only with two or more published works", () => {
    const { unmount } = renderPanel([project({ id: "only" })]);
    expect(screen.queryByRole("button", { name: /จัดลำดับ/ })).not.toBeInTheDocument();
    unmount();
    renderPanel([project({ id: "a" }), project({ id: "b" })]);
    fireEvent.click(screen.getByRole("button", { name: /จัดลำดับ/ }));
    expect(screen.getByRole("button", { name: "เสร็จสิ้น" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(screen.queryByRole("button", { name: "เสร็จสิ้น" })).not.toBeInTheDocument();
  });
});
