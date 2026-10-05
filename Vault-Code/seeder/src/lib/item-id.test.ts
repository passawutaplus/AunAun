import assert from "node:assert/strict";
import { test } from "node:test";
import { itemIdFrom } from "./item-id";

test("itemIdFrom finds an id in a bare value, a link or pasted text, lower-cased", () => {
  const id = "0A1B2C3D-1111-4222-8333-444455556666";
  assert.equal(itemIdFrom(id), id.toLowerCase());
  assert.equal(itemIdFrom(`https://aplus-vault.vercel.app/discover?item=${id}&x=1`), id.toLowerCase());
  assert.equal(itemIdFrom("please remove  " + id + "  thanks"), id.toLowerCase());
  assert.equal(itemIdFrom("no id here"), null);
  assert.equal(itemIdFrom(""), null);
});
