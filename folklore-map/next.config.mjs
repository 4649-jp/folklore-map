// Next.js dev server では NODE_ENV が空になるケースもあるため、production 以外を開発とみなす
const isDev = process.env.NODE_ENV !== "production";

const mapImageHosts = [
  "https://maps.googleapis.com",
  "https://maps.gstatic.com",
  "https://ktgis.net",
  "https://*.ktgis.net",
];

const devWsOrigins = [
  "ws://localhost:3000",
  "ws://0.0.0.0:3000",
  "ws://127.0.0.1:3000",
  "ws://192.168.0.238:3000",
];

const devHttpOrigins = devWsOrigins.map((ws) => ws.replace("ws://", "http://"));

/** @type {import('next').NextConfig & { allowedDevOrigins?: string[] }} */
const nextConfig = {
  // 開発環境でのクロスオリジンアクセスを許可（LAN/localhost両対応）
  allowedDevOrigins: devHttpOrigins,
  // セキュリティヘッダーはsrc/middleware.tsで一元管理
};

export default nextConfig;
