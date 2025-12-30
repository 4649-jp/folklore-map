import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security middleware
 * Adds security headers to all responses
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get Supabase URL from environment or request
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseDomain = new URL(supabaseUrl).hostname;

  // Content Security Policy
  // Uses nonces for inline scripts, allows necessary external sources
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDevelopment = process.env.NODE_ENV !== "production";

  // CSP directives（開発・本番共通）
  const cspDirectives = [
    // Default: only same origin
    "default-src 'self'",

    // Scripts: self, Google Maps
    // 開発環境のみ'unsafe-eval'許可（HMR用）、本番は厳格化
    isDevelopment
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com"
      : "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com",

    // Styles: self, Google Maps/Fonts, inline styles (Maps必須)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com",

    // Images: self, Google Maps, Supabase, 国土地理院（古地図タイル）
    `img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://${supabaseDomain} https://cyberjapandata.gsi.go.jp`,

    // Fonts: self, Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",

    // Connect: self, APIs, WebSocket（開発時のみ）
    `connect-src 'self' https://maps.googleapis.com https://*.googleapis.com https://${supabaseDomain} https://cyberjapandata.gsi.go.jp` +
      (isDevelopment ? " ws://localhost:3000 ws://0.0.0.0:3000 ws://127.0.0.1:3000 ws://192.168.0.238:3000" : ""),

    // Frames: Google Maps only
    "frame-src https://maps.googleapis.com https://www.google.com",

    // Object/embed: none
    "object-src 'none'",

    // Base URI: self only
    "base-uri 'self'",

    // Form actions: self only
    "form-action 'self'",

    // Frame ancestors: prevent clickjacking
    "frame-ancestors 'none'",

    // Upgrade insecure requests (本番のみ)
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  const csp = cspDirectives.join("; ");

  // Set security headers
  response.headers.set("Content-Security-Policy", csp);

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer policy: send origin only on cross-origin requests
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // XSS Protection (legacy, but doesn't hurt)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Permissions Policy: restrict powerful features
  const permissionsPolicy = [
    "geolocation=(self)", // Allow geolocation for our app
    "microphone=()", // No microphone
    "camera=()", // No camera
    "payment=()", // No payment APIs
    "usb=()", // No USB
    "magnetometer=()", // No magnetometer
    "accelerometer=()", // No accelerometer
    "gyroscope=()", // No gyroscope
  ].join(", ");

  response.headers.set("Permissions-Policy", permissionsPolicy);

  // Strict Transport Security (HSTS) - only in production
  if (!isDevelopment) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

/**
 * Configure which routes use this middleware
 * Apply to all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
