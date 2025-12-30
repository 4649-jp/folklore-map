import { describe, it, expect } from "vitest";
import { SpotCreateSchema, SpotUpdateSchema } from "@/lib/schemas/spots";

describe("SpotCreateSchema", () => {
  it("正常なスポット作成データを検証できる", () => {
    const validData = {
      title: "酒呑童子の伝説",
      description: "京都の大江山に住んでいたとされる鬼の伝説です。",
      address: "京都府福知山市大江町",
      maps_query: "大江山 京都",
      lat: 35.3456,
      lng: 135.1234,
      icon_type: "ONI",
      era_hint: "平安時代",
      sources: [
        {
          type: "URL",
          citation: "大江山の伝説",
          url: "https://example.com",
        },
      ],
    };

    const result = SpotCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("タイトルが短すぎる場合はエラー", () => {
    const invalidData = {
      title: "短", // 2文字未満
      description: "説明文です。",
      lat: 35.0,
      lng: 135.0,
      sources: [
        {
          type: "URL",
          citation: "出典",
          url: "https://example.com",
        },
      ],
    };

    const result = SpotCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("タイトルが長すぎる場合はエラー", () => {
    const invalidData = {
      title: "あ".repeat(81), // 80文字超
      description: "説明文です。",
      lat: 35.0,
      lng: 135.0,
      sources: [
        {
          type: "URL",
          citation: "出典",
          url: "https://example.com",
        },
      ],
    };

    const result = SpotCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("説明文が3000文字を超える場合はエラー", () => {
    const invalidData = {
      title: "テストスポット",
      description: "あ".repeat(3001),
      lat: 35.0,
      lng: 135.0,
      sources: [
        {
          type: "URL",
          citation: "出典",
          url: "https://example.com",
        },
      ],
    };

    const result = SpotCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("出典が1件以上必須", () => {
    const invalidData = {
      title: "テストスポット",
      description: "説明文です。",
      lat: 35.0,
      lng: 135.0,
      sources: [], // 出典が空
    };

    const result = SpotCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("URL型の出典にはURLが必須", () => {
    const invalidData = {
      title: "テストスポット",
      description: "説明文です。",
      lat: 35.0,
      lng: 135.0,
      sources: [
        {
          type: "URL",
          citation: "出典",
          // url がない
        },
      ],
    };

    const result = SpotCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("BOOK型の出典はURLなしでOK", () => {
    const validData = {
      title: "テストスポット",
      description: "説明文です。これは十分な長さの説明文です。",
      address: "東京都渋谷区",
      maps_query: "渋谷駅",
      lat: 35.0,
      lng: 135.0,
      icon_type: "GENERIC",
      sources: [
        {
          type: "BOOK",
          citation: "日本民俗学大辞典（2020年）",
        },
      ],
    };

    const result = SpotCreateSchema.safeParse(validData);
    if (!result.success) {
      console.error("Validation errors:", JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("緯度・経度の範囲チェック", () => {
    const invalidLat = {
      title: "テストスポット",
      description: "説明文です。",
      lat: 91.0, // 緯度は-90〜90
      lng: 135.0,
      sources: [
        {
          type: "URL",
          citation: "出典",
          url: "https://example.com",
        },
      ],
    };

    const result1 = SpotCreateSchema.safeParse(invalidLat);
    expect(result1.success).toBe(false);

    const invalidLng = {
      title: "テストスポット",
      description: "説明文です。",
      lat: 35.0,
      lng: 181.0, // 経度は-180〜180
      sources: [
        {
          type: "URL",
          citation: "出典",
          url: "https://example.com",
        },
      ],
    };

    const result2 = SpotCreateSchema.safeParse(invalidLng);
    expect(result2.success).toBe(false);
  });

  it("icon_typeの値チェック", () => {
    const invalidIconType = {
      title: "テストスポット",
      description: "説明文です。",
      lat: 35.0,
      lng: 135.0,
      icon_type: "INVALID_TYPE", // 無効な値
      sources: [
        {
          type: "URL",
          citation: "出典",
          url: "https://example.com",
        },
      ],
    };

    const result = SpotCreateSchema.safeParse(invalidIconType);
    expect(result.success).toBe(false);
  });
});

describe("SpotUpdateSchema", () => {
  it("部分更新が可能", () => {
    const validData = {
      title: "更新されたタイトル",
    };

    const result = SpotUpdateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("ステータス更新が可能", () => {
    const validData = {
      status: "PUBLISHED",
    };

    const result = SpotUpdateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("無効なステータスはエラー", () => {
    const invalidData = {
      status: "INVALID_STATUS",
    };

    const result = SpotUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
