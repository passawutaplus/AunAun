import { fireEvent, render, screen } from "@testing-library/react";
import { EarningsTransactionHistory } from "@/components/earnings/EarningsTransactionHistory";
import { seedHireWalletPreview } from "@/lib/payments/hireWallet";

describe("EarningsTransactionHistory", () => {
  it("uses eye and arrow icons instead of action/pagination text", () => {
    const seed = seedHireWalletPreview();
    render(
      <EarningsTransactionHistory
        income={seed.income}
        payouts={seed.payouts}
        status="all"
        onStatusChange={() => {}}
      />,
    );

    expect(screen.queryByText("ดูรายละเอียด")).not.toBeInTheDocument();
    expect(screen.queryByText("ก่อนหน้า")).not.toBeInTheDocument();
    expect(screen.queryByText("ถัดไป")).not.toBeInTheDocument();

    const eyes = screen.getAllByRole("button", { name: "ดูรายละเอียด" });
    expect(eyes.length).toBeGreaterThan(0);

    fireEvent.click(eyes[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ปิด" }));

    const next = screen.getByRole("button", { name: "ถัดไป" });
    const prev = screen.getByRole("button", { name: "ก่อนหน้า" });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(screen.getByText(/หน้า 2\//)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ก่อนหน้า" })).toBeEnabled();
  });
});
