import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EarningsHireBalanceCard } from "@/components/earnings/EarningsHireBalanceCard";

const base = {
  availableSatang: 1_845_000,
  onWithdraw: vi.fn(),
  canWithdraw: true,
};

describe("EarningsHireBalanceCard", () => {
  it("shows THB balance, bank destination, and withdraw CTA", () => {
    render(
      <EarningsHireBalanceCard
        {...base}
        bankName="กสิกรไทย"
        accountLast4="4521"
      />,
    );
    expect(screen.getByText("กระเป๋า")).toBeInTheDocument();
    expect(screen.getByText("ถอนเข้า กสิกรไทย •••• 4521")).toBeInTheDocument();
    expect(screen.getByText("ยอดในกระเป๋า")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ถอนเงิน" })).toBeEnabled();
    expect(screen.queryByText(/ขั้นต่ำถอน/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ค่าธรรมเนียมโอน/)).not.toBeInTheDocument();
  });

  it("falls back to a generic bank line when no account is linked", () => {
    render(<EarningsHireBalanceCard {...base} />);
    expect(screen.getByText("ถอนเข้าบัญชีธนาคาร")).toBeInTheDocument();
  });

  it("disables withdraw and keeps the reason in the title", () => {
    render(
      <EarningsHireBalanceCard
        {...base}
        canWithdraw={false}
        withdrawHint="อีก ฿200 ถึงขั้นต่ำถอน"
      />,
    );
    const btn = screen.getByRole("button", { name: "ถอนเงิน" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "อีก ฿200 ถึงขั้นต่ำถอน");
  });

  it("lets preview users reset sample data", () => {
    const onResetPreview = vi.fn();
    render(
      <EarningsHireBalanceCard
        {...base}
        isPreview
        onResetPreview={onResetPreview}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "รีเซ็ตตัวอย่าง" }));
    expect(onResetPreview).toHaveBeenCalledTimes(1);
  });
});
