import { describe, it, expect } from "vitest";
import { stripHtml, escapeHtml, sanitizeText } from "@/lib/sanitize";

describe("sanitize.ts - stripHtml", () => {
  it("HTMLタグを削除する", () => {
    expect(stripHtml("<script>alert('xss')</script>")).toBe("alert('xss')");
    expect(stripHtml("<div>テキスト</div>")).toBe("テキスト");
    expect(stripHtml("テキスト<br>改行")).toBe("テキスト改行");
  });

  it("通常の文字列はそのまま返す", () => {
    expect(stripHtml("Hello World")).toBe("Hello World");
    expect(stripHtml("日本語テキスト")).toBe("日本語テキスト");
    expect(stripHtml("123456")).toBe("123456");
  });

  it("スクリプトタグを削除する", () => {
    expect(stripHtml("<img src=x onerror=alert(1)>")).toBe("");
    expect(stripHtml("<iframe src='evil.com'></iframe>")).toBe("");
  });

  it("複数のタグが混在する場合", () => {
    const input = "<p>段落1</p><script>悪意あるコード</script><p>段落2</p>";
    const result = stripHtml(input);
    expect(result).toBe("段落1悪意あるコード段落2");
  });
});

describe("sanitize.ts - escapeHtml", () => {
  it("HTMLの特殊文字をエスケープする", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
    expect(escapeHtml("A&B")).toBe("A&amp;B");
  });

  it("通常の文字列はそのまま返す", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
    expect(escapeHtml("日本語テキスト")).toBe("日本語テキスト");
  });
});

describe("sanitize.ts - sanitizeText", () => {
  it("HTMLタグを削除して特殊文字をエスケープする", () => {
    const input = '<script>alert("xss")</script>';
    // タグが削除され、残った文字がエスケープされる
    expect(sanitizeText(input)).toBe("alert(&quot;xss&quot;)");
  });

  it("空文字列を処理できる", () => {
    expect(sanitizeText("")).toBe("");
  });
});
