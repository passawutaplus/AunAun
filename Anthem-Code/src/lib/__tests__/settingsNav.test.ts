import { describe, expect, it } from "vitest";
import {
  resolveSettingsPanel,
  SETTINGS_ACCOUNT_HREF,
  SETTINGS_PIN_RECOVER_HREF,
} from "@/lib/settingsNav";

describe("settings nav", () => {
  it("sends password and pin hashes to the account panel", () => {
    expect(resolveSettingsPanel("#account")).toBe("account");
    expect(resolveSettingsPanel("#settings-password")).toBe("account");
    expect(resolveSettingsPanel("#settings-pin")).toBe("account");
    expect(resolveSettingsPanel("#privacy")).toBe("privacy");
  });

  it("keeps recover-pin deep link on the account settings path", () => {
    expect(SETTINGS_ACCOUNT_HREF).toBe("/settings#account");
    expect(SETTINGS_PIN_RECOVER_HREF).toBe("/settings?recover=pin#account");
  });
});
