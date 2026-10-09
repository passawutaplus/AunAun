import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeCronBearer } from "../cronAuth.server";

const req = (token?: string) =>
  new Request("https://x.test/cron", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

describe("authorizeCronBearer", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    delete process.env.CRON_DISALLOW_SERVICE_KEY;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it("accepts CRON_SECRET", () => {
    expect(authorizeCronBearer(req("cron-secret"))).toBeNull();
  });
  it("rejects missing header with 401", () => {
    expect(authorizeCronBearer(req())?.status).toBe(401);
  });
  it("rejects wrong or different-length token with 403", () => {
    expect(authorizeCronBearer(req("nope"))?.status).toBe(403);
    expect(authorizeCronBearer(req("cron-secret-extra"))?.status).toBe(403);
  });
  it("still accepts the legacy service key, with a warning", () => {
    expect(authorizeCronBearer(req("service-key"))).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });
  it("rejects the service key when CRON_DISALLOW_SERVICE_KEY=true", () => {
    process.env.CRON_DISALLOW_SERVICE_KEY = "true";
    expect(authorizeCronBearer(req("service-key"))?.status).toBe(403);
  });
  it("500s when nothing is configured", () => {
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(authorizeCronBearer(req("x"))?.status).toBe(500);
  });
});
