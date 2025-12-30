import { describe, it, expect } from "vitest";
import { hasRole, ROLE_PRIORITY } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

describe("auth.ts - hasRole", () => {
  it("同じロールの場合はtrue", () => {
    expect(hasRole("viewer", "viewer")).toBe(true);
    expect(hasRole("editor", "editor")).toBe(true);
    expect(hasRole("reviewer", "reviewer")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
  });

  it("上位ロールは下位ロールの権限を持つ", () => {
    // admin は全権限を持つ
    expect(hasRole("viewer", "admin")).toBe(true);
    expect(hasRole("editor", "admin")).toBe(true);
    expect(hasRole("reviewer", "admin")).toBe(true);

    // reviewer は viewer, editor の権限を持つ
    expect(hasRole("viewer", "reviewer")).toBe(true);
    expect(hasRole("editor", "reviewer")).toBe(true);

    // editor は viewer の権限を持つ
    expect(hasRole("viewer", "editor")).toBe(true);
  });

  it("下位ロールは上位ロールの権限を持たない", () => {
    // viewer は editor, reviewer, admin の権限を持たない
    expect(hasRole("editor", "viewer")).toBe(false);
    expect(hasRole("reviewer", "viewer")).toBe(false);
    expect(hasRole("admin", "viewer")).toBe(false);

    // editor は reviewer, admin の権限を持たない
    expect(hasRole("reviewer", "editor")).toBe(false);
    expect(hasRole("admin", "editor")).toBe(false);

    // reviewer は admin の権限を持たない
    expect(hasRole("admin", "reviewer")).toBe(false);
  });

  it("nullロールは何も持たない", () => {
    expect(hasRole("viewer", null)).toBe(false);
    expect(hasRole("editor", null)).toBe(false);
    expect(hasRole("reviewer", null)).toBe(false);
    expect(hasRole("admin", null)).toBe(false);
  });

  it("ROLE_PRIORITYが正しく定義されている", () => {
    expect(ROLE_PRIORITY.viewer).toBeLessThan(ROLE_PRIORITY.editor);
    expect(ROLE_PRIORITY.editor).toBeLessThan(ROLE_PRIORITY.reviewer);
    expect(ROLE_PRIORITY.reviewer).toBeLessThan(ROLE_PRIORITY.admin);
  });

  it("境界条件: 現在のロールがnullの場合", () => {
    // 現在のロールがnullの場合は常にfalseを返す（権限なし）
    expect(hasRole("viewer", null)).toBe(false);
    expect(hasRole("admin", null)).toBe(false);
  });
});
