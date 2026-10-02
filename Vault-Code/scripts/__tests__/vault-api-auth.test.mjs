import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { resolveAuthContext, signVaultToken, verifyVaultToken } from "../../lib/vault-api-auth.mjs";

const userId = "11111111-1111-4111-8111-111111111111";
const req = token => ({ headers: { authorization: `Bearer ${token}` } });

describe("vault-api-auth", () => {
  before(() => {
    process.env.VAULT_EXTENSION_TOKEN_SECRET = "test-secret-for-signed-extension-tokens";
  });

  it("scopes signed extension tokens to the user id", async () => {
    const auth = await resolveAuthContext(req(signVaultToken(userId)));
    assert.equal(auth.userId, userId);
  });

  it("rejects forged signed tokens", async () => {
    const forged = `vxt1.${userId}.${"A".repeat(43)}`;
    assert.equal(verifyVaultToken(forged), null);
    await assert.rejects(resolveAuthContext(req(forged)), err => err.status === 401);
  });

  it("rejects a token signed for someone else", async () => {
    const other = "22222222-2222-4222-8222-222222222222";
    const mac = signVaultToken(other).split(".")[2];
    await assert.rejects(resolveAuthContext(req(`vxt1.${userId}.${mac}`)), err => err.status === 401);
  });

  it("no longer trusts guessable vault-user tokens", async () => {
    await assert.rejects(resolveAuthContext(req(`vault-user-${userId}`)), err => err.status === 401);
  });

  it("keeps random guest tokens in their own anonymous scope", async () => {
    const auth = await resolveAuthContext(req("vault-abc123random"));
    assert.equal(auth.userId, null);
    assert.ok(auth.bearerHash);
  });
});
