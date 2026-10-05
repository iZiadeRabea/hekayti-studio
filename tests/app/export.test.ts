import { test } from "node:test";
import assert from "node:assert/strict";
import { proofHtml, proofMetadata, profiles } from "@hekayti/export";
import { fixture, names } from "./fixtures";
test("deterministic export metadata tracks canonical inputs, profile and page order", async () => {
  const b = names.map(fixture);
  const print = await proofMetadata(b, "print");
  assert.deepEqual(print, await proofMetadata(b, "print"));
  assert.equal(print.pageIds.length, 6);
  assert.equal(print.profile.pageMm, 206);
  const digital = await proofMetadata(b, "digital");
  assert.equal(digital.profile.pageMm, 200);
  assert.equal(print.sourceHash, digital.sourceHash);
  b[0]!.workingTitle += " edited";
  assert.notEqual(
    (await proofMetadata(b, "print")).sourceHash,
    print.sourceHash,
  );
});
test("export HTML escapes untrusted text and declares logical RTL/LTR, bleed and page size", () => {
  const b = names.map(fixture);
  b[0]!.workingTitle = '<script>alert("bad")</script>';
  const html = proofHtml(b, "print", { arabic: "", latin: "" });
  assert.ok(!html.includes("<script>alert"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /dir="ltr"/);
  assert.match(html, /size:206mm 206mm/);
  assert.match(
    proofHtml(b, "digital", { arabic: "", latin: "" }),
    /size:200mm 200mm/,
  );
  assert.equal(profiles.print.productionReady, false);
});
