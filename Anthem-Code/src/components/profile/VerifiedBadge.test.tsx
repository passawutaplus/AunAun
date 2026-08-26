import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import VerifiedBadge from "@/components/profile/VerifiedBadge";

function wrap(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("VerifiedBadge", () => {
  it("renders nothing when not verified", () => {
    const { container } = wrap(<VerifiedBadge verified={false} />);
    expect(container.querySelector("[aria-label='ยืนยันตัวตนแล้ว']")).toBeNull();
  });

  it("shows a labelled checkmark when verified", () => {
    wrap(<VerifiedBadge verified />);
    expect(screen.getByRole("img", { name: "ยืนยันตัวตนแล้ว" })).toBeInTheDocument();
  });
});
