import assert from "node:assert/strict";
import { test } from "node:test";
import { sendEmail, takedownReplyText } from "./email";

test("sendEmail does nothing without RESEND_API_KEY", async () => {
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  let called = false;
  const ok = await sendEmail("a@b.co", "s", "t", { fetchImpl: (async () => { called = true; return new Response("{}"); }) as typeof fetch });
  assert.equal(ok, false);
  assert.equal(called, false);
  if (saved) process.env.RESEND_API_KEY = saved;
});

test("sendEmail posts to Resend and reports whether it was accepted", async () => {
  process.env.RESEND_API_KEY = "re_test";
  let body: { to: string[]; subject: string } | null = null;
  const ok = await sendEmail("owner@example.com", "Hi", "text", { from: "A+ <x@y.z>", fetchImpl: (async (_u: unknown, init: { body: string }) => { body = JSON.parse(init.body); return new Response("{}", { status: 200 }); }) as unknown as typeof fetch });
  assert.equal(ok, true);
  assert.deepEqual(body!.to, ["owner@example.com"]);
  assert.equal(body!.subject, "Hi");
  const bad = await sendEmail("owner@example.com", "Hi", "text", { fetchImpl: (async () => new Response("no", { status: 422 })) as typeof fetch });
  assert.equal(bad, false);
  delete process.env.RESEND_API_KEY;
});

test("takedown reply names the image, confirms removal and includes the Thai line", () => {
  const r = takedownReplyText("Poster A", "Sorry about that.");
  assert.match(r.subject, /removed/);
  assert.match(r.text, /Poster A/);
  assert.match(r.text, /Sorry about that\./);
  assert.match(r.text, /ถูกนำออก/);
});
