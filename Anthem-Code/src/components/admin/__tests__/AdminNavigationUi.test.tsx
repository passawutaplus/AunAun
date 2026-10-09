import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminCommandMenu from "@/components/admin/AdminCommandMenu";
import AdminDbGapNotice from "@/components/admin/AdminDbGapNotice";
import { adminQueueEntries, type AdminBadgeCounts } from "@/lib/admin/adminNavigation";

const zero: AdminBadgeCounts = { kyc: 0, reports: 0, cashouts: 0, finance: 0, aml: 0, hiring: 0, collabs: 0, feedback: 0 };

let queueCounts: AdminBadgeCounts = zero;

vi.mock("@/hooks/admin/useAdminRealtime", () => ({ useAdminRealtime: () => undefined }));
vi.mock("@/hooks/admin/useAdminQueue", () => ({
  useAdminQueue: () => {
    const entries = adminQueueEntries(queueCounts);
    return { counts: queueCounts, entries, total: entries.reduce((n, e) => n + e.count, 0), loading: false, unavailable: [] };
  },
}));
vi.mock("@/components/brand/BrandLogo", () => ({ BrandLogo: () => <span data-testid="logo" /> }));

beforeAll(() => {
  // cmdk (command palette) expects these browser APIs.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  window.localStorage.clear();
  queueCounts = zero;
  vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");
});

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

describe("AdminSidebar", () => {
  it("opens only the group you are in, others stay folded until clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/kyc"]}>
        <AdminSidebar />
      </MemoryRouter>,
    );
    // KYC lives in "ผู้ใช้ & ตัวตน": open. "ผลงาน" lives in another group: folded.
    expect(screen.getByRole("link", { name: /ยืนยันตัวตน \(KYC\)/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^ผลงาน$/ })).not.toBeInTheDocument();

    const header = screen.getByRole("button", { name: /ผลงาน & ชุมชน/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /^ผลงาน$/ })).toBeInTheDocument();
  });

  it("remembers opened groups between visits", async () => {
    const first = render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminSidebar />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /การเงิน/ }));
    first.unmount();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /การเงิน/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("shows 'no pending work' when every queue is empty", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("ไม่มีงานค้าง")).toBeInTheDocument();
  });

  it("lists the queues that have work, with counts, most sensitive first", () => {
    queueCounts = { ...zero, feedback: 3, kyc: 2, reports: 5 };
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminSidebar />
      </MemoryRouter>,
    );
    const queue = screen.getByRole("region", { name: "ต้องทำตอนนี้" });
    const links = within(queue).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["ยืนยันตัวตน (KYC)2", "รายงานเนื้อหา5", "ฟีดแบ็กผู้ใช้3"]);
    expect(within(queue).queryByText("ไม่มีงานค้าง")).not.toBeInTheDocument();
  });

  it("tags pages that wait on the database and says why in the tooltip", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/finance"]}>
        <AdminSidebar />
      </MemoryRouter>,
    );
    const finance = screen.getByRole("link", { name: /การเงิน \(Payso\)/ });
    expect(within(finance).getByText("รอ DB")).toBeInTheDocument();
    expect(finance).toHaveAttribute("title", expect.stringContaining("รอ DB"));
  });

  it("drawer variant is visible on phones (the desktop variant is hidden below md)", () => {
    const { container, rerender } = render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminSidebar variant="drawer" />
      </MemoryRouter>,
    );
    expect(container.querySelector("aside")?.className).not.toMatch(/\bhidden\b/);
    rerender(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminSidebar variant="desktop" />
      </MemoryRouter>,
    );
    expect(container.querySelector("aside")?.className).toMatch(/\bhidden\b/);
  });

  it("closes the drawer when a link is chosen", async () => {
    const onNavigate = vi.fn();
    render(
      <MemoryRouter initialEntries={["/admin/kyc"]}>
        <AdminSidebar variant="drawer" onNavigate={onNavigate} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("link", { name: /ยืนยันตัวตน \(KYC\)/ }));
    expect(onNavigate).toHaveBeenCalled();
  });

  it("opens search from the sidebar button", async () => {
    const onOpenSearch = vi.fn();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminSidebar onOpenSearch={onOpenSearch} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /ค้นหาเมนู/ }));
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });
});

describe("AdminCommandMenu", () => {
  it("filters by a synonym and jumps to the page", async () => {
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminCommandMenu open onOpenChange={onOpenChange} />
        <Where />
      </MemoryRouter>,
    );
    const input = screen.getByPlaceholderText(/ค้นหาเมนู/);
    fireEvent.change(input, { target: { value: "ลิขสิทธิ์" } });
    const option = await screen.findByRole("option", { name: /กฎหมาย \(PDPA \/ ลิขสิทธิ์\)/ });
    fireEvent.click(option);
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/compliance");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("says so when nothing matches", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminCommandMenu open onOpenChange={() => undefined} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/ค้นหาเมนู/), { target: { value: "zzzxxyy" } });
    expect(await screen.findByText("ไม่พบเมนูที่ตรงกัน")).toBeInTheDocument();
  });

  it("still finds retired pages so old data can be cleaned up", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminCommandMenu open onOpenChange={() => undefined} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText(/ค้นหาเมนู/), { target: { value: "studio" } });
    expect(await screen.findByRole("option", { name: /สตูดิโอ \(เลิกใช้\)/ })).toBeInTheDocument();
  });
});

describe("AdminDbGapNotice", () => {
  it("explains what is missing on an affected page", () => {
    render(<AdminDbGapNotice pathname="/admin/compliance/privacy" />);
    expect(screen.getByRole("status")).toHaveTextContent("ฐานข้อมูลยังไม่มี");
    expect(screen.getByText("privacy_requests")).toBeInTheDocument();
  });

  it("renders nothing on a healthy page", () => {
    const { container } = render(<AdminDbGapNotice pathname="/admin/kyc" />);
    expect(container).toBeEmptyDOMElement();
  });
});
