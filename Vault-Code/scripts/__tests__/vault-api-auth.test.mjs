import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAuthContext } from "../../lib/vault-api-auth.mjs";

describe("vault-api-auth", () => {
  it("scopes vault-user tokens to user id", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const req = {
      headers: {
        authorization: `Bearer vault-user-${userId}`,
      },
    };
    const auth = await resolveAuthContext(req);
    assert.equal(auth.userId, userId);
  });
});
