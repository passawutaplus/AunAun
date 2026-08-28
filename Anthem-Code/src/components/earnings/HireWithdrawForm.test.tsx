import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HireWithdrawForm } from "@/components/earnings/HireWithdrawForm";
import { seedHireWalletPreview } from "@/lib/payments/hireWallet";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "preview-user" } }),
}));

describe("HireWithdrawForm", () => {
  it("shows a free-transfer box and hides struck-through copy", () => {
    const seed = seedHireWalletPreview();
    render(
      <MemoryRouter>
        <HireWithdrawForm
          view={seed}
          isPreview
          cancelTo="/earnings"
          onConfirm={() => ({ ok: false, reason: "below_minimum" })}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText("เลือกวิธีการถอนเงิน")).not.toBeInTheDocument();
    expect(screen.queryByText("เงินเข้าหลังรอบโอนรายสัปดาห์ — ไม่ใช่เข้าทันทีวันนี้")).not.toBeInTheDocument();
    expect(screen.queryByText(/ใส่จำนวน หรือกดถอนทั้งหมด/)).not.toBeInTheDocument();
    expect(screen.getByText("โอนฟรี")).toBeInTheDocument();
    expect(screen.getByText(/เดือนนี้ใช้โควต้าถอนฟรีแล้ว/)).toBeInTheDocument();
    expect(screen.getByText(/ยอดที่ถอนได้/)).toBeInTheDocument();
  });
});
