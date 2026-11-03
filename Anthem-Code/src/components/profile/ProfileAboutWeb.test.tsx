import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfileAboutWeb from "./ProfileAboutWeb";

const profile = {
  bio: "Hello",
  website: null,
  instagram: null,
  facebook: null,
  line_id: "line-from-profile",
};

describe("ProfileAboutWeb contacts", () => {
  it("hides the LINE id when the creator turned it off", () => {
    render(
      <ProfileAboutWeb
        profile={{ ...profile, cv: { contactLine: "line-from-cv", visibility: { contactLine: false } } }}
        experience={[]}
        skills={[]}
      />,
    );
    expect(screen.queryByText("line-from-cv")).toBeNull();
    expect(screen.queryByText("line-from-profile")).toBeNull();
  });

  it("shows the CV LINE id, falling back to the profile one, when turned on", () => {
    const { rerender } = render(
      <ProfileAboutWeb
        profile={{ ...profile, cv: { contactLine: "line-from-cv", visibility: { contactLine: true } } }}
        experience={[]}
        skills={[]}
      />,
    );
    expect(screen.getByText("line-from-cv")).toBeInTheDocument();
    rerender(
      <ProfileAboutWeb profile={{ ...profile, cv: { visibility: { contactLine: true } } }} experience={[]} skills={[]} />,
    );
    expect(screen.getByText("line-from-profile")).toBeInTheDocument();
  });
});
