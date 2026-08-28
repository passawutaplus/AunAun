import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { InboxPersonCard } from "@/components/inbox/InboxPersonCard";

describe("InboxPersonCard", () => {
  it("links to the public profile", () => {
    render(
      <MemoryRouter>
        <InboxPersonCard label="ลูกค้า" name="msk.petch" to="/@msk.petch" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "ดูโปรไฟล์ msk.petch" })).toHaveAttribute(
      "href",
      "/@msk.petch",
    );
  });
});
