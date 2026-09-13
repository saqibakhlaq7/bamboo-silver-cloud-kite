import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSafeAvatarDataUrl,
  isSafeMediaDataUrl,
  parseDataUrl,
  sanitizeLocalMedia,
} from "./safe-media.ts";

const jpeg = "data:image/jpeg;base64,/9j/4AAQ=";
const webm = "data:audio/webm;codecs=opus;base64,GkXfo=";
const pdf = "data:application/pdf;base64,JVBERi0=";

describe("safe-media", () => {
  it("accepts canvas JPEGs and MediaRecorder webm", () => {
    assert.equal(parseDataUrl(jpeg)?.mime, "image/jpeg");
    assert.equal(isSafeMediaDataUrl("image", jpeg, "image/jpeg"), true);
    assert.equal(isSafeMediaDataUrl("voice", webm, "audio/webm;codecs=opus"), true);
    assert.equal(isSafeAvatarDataUrl(jpeg), true);
  });

  it("rejects javascript and HTML payloads", () => {
    assert.equal(parseDataUrl("javascript:alert(1)"), null);
    assert.equal(isSafeMediaDataUrl("file", "data:text/html;base64,PGh0bWw+", "text/html"), false);
    assert.equal(isSafeMediaDataUrl("file", "javascript:alert(1)", "text/plain"), false);
    assert.equal(isSafeAvatarDataUrl("data:image/svg+xml;base64,PHN2Zz4="), false);
  });

  it("rejects mime mismatches and executable files", () => {
    assert.equal(isSafeMediaDataUrl("image", jpeg, "image/png"), false);
    assert.equal(isSafeMediaDataUrl("file", "data:text/html;base64,PGh0bWw+", "text/html"), false);
    assert.equal(isSafeMediaDataUrl("file", pdf, "application/pdf"), true);
  });

  it("drops unsafe inbound media", () => {
    assert.equal(sanitizeLocalMedia(null), null);
    assert.equal(
      sanitizeLocalMedia({
        kind: "file",
        name: "x.html",
        mime: "text/html",
        dataUrl: "data:text/html;base64,PGh0bWw+",
      }),
      null,
    );
    assert.deepEqual(sanitizeLocalMedia({ kind: "image", name: "p.jpg", mime: "image/jpeg", dataUrl: jpeg }), {
      kind: "image",
      name: "p.jpg",
      mime: "image/jpeg",
      dataUrl: jpeg,
    });
  });
});
