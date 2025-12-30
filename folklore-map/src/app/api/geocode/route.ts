import type { NextRequest } from "next/server";

import { errorResponse, jsonResponse, zodErrorResponse } from "@/lib/http";
import { GeocodeRequestSchema } from "@/lib/schemas/geocode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRole, hasRole } from "@/lib/auth";
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const GEOCODE_ENDPOINT =
  "https://maps.googleapis.com/maps/api/geocode/json";

type GoogleGeocodeResult = {
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
  };
  formatted_address: string;
  place_id: string;
  types: string[];
};

type GoogleGeocodeResponse = {
  status: string;
  results: GoogleGeocodeResult[];
  error_message?: string;
};

export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimit(
    `geocode:${clientIp}`,
    RATE_LIMITS.GEOCODE
  );

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  // 認証チェック（editor以上のみジオコーディング可能）
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = getUserRole(session);
  if (!hasRole("editor", role)) {
    return errorResponse("ジオコーディングはログインした編集者のみ利用できます。", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  const json = await request.json().catch(() => null);
  if (!json) {
    return errorResponse("JSON ボディが必要です。", {
      status: 400,
      code: "INVALID_BODY",
    });
  }

  const parsed = GeocodeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return errorResponse("Google Maps API キーが設定されていません。", {
      status: 500,
      code: "MISSING_API_KEY",
    });
  }

  const query = new URLSearchParams({
    address: parsed.data.text,
    key: apiKey,
    language: "ja",
    region: "jp",
  });

  let response: GoogleGeocodeResponse;
  try {
    const res = await fetch(`${GEOCODE_ENDPOINT}?${query.toString()}`, {
      method: "GET",
    });
    response = (await res.json()) as GoogleGeocodeResponse;
  } catch (error) {
    console.error("[POST /api/geocode] fetch error", error);
    return errorResponse("ジオコーディング API の呼び出しに失敗しました。", {
      status: 502,
      code: "GEOCODE_FETCH_FAILED",
    });
  }

  if (response.status !== "OK" || response.results.length === 0) {
    const code =
      response.status === "ZERO_RESULTS"
        ? "GEOCODE_ZERO_RESULTS"
        : "GEOCODE_ERROR";
    return errorResponse(
      response.error_message ?? "位置情報を取得できませんでした。",
      {
        status: 404,
        code,
        details: { status: response.status },
      }
    );
  }

  const top = response.results[0];

  return jsonResponse({
    formatted_address: top.formatted_address,
    place_id: top.place_id,
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    location_type: top.geometry.location_type,
    types: top.types,
  });
}
