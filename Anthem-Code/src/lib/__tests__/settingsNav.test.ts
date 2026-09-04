import { describe, expect, it } from "vitest";
import {
  ABOUT_ME_EDIT_HREF,
  isAboutMeSettingsHash,
  resolveSettingsPanel,
  SETTINGS_ACCOUNT_HREF,
  SETTINGS_PIN_RECOVER_HREF,
} from "@/lib/settingsNav";

describe("settings nav", () => {
  it("sends password and pin hashes to the account panel", () => {
    expect(resolveSettingsPanel("#account")).toBe("account");
    expect(resolveSettingsPanel("#settings-password")).toBe("account");
    expect(resolveSettingsPanel("#settings-pin")).toBe("account");
    expect(resolveSettingsPanel("#settings-education")).toBe("profile");
    expect(resolveSettingsPanel("#settings-cv-photo")).toBe("profile");
  });

  it("keeps recover-pin deep link on the account settings path", () => {
    expect(SETTINGS_ACCOUNT_HREF).toBe("/settings#account");
    expect(SETTINGS_PIN_RECOVER_HREF).toBe("/settings?recover=pin#account");
  });

  it("sends legacy About hashes to the profile About Me tab", () => {
    expect(isAboutMeSettingsHash("#profile-about")).toBe(true);
    expect(isAboutMeSettingsHash("settings-education")).toBe(true);
    expect(isAboutMeSettingsHash("#account")).toBe(false);
    expect(ABOUT_ME_EDIT_HREF).toBe("/portfolio?tab=about");
  });
});
