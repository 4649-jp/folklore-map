import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const results: string[] = [];

  try {
    results.push(`✅ 環境変数: URL=${url}, Key=${key?.substring(0, 20)}...`);

    // Health check
    const healthRes = await fetch(`${url}/auth/v1/health`);
    const healthData = await healthRes.json();
    results.push(`✅ Health Check: ${JSON.stringify(healthData)}`);

    // Signup test
    const signupRes = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: key!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: "test123456",
      }),
    });
    const signupData = await signupRes.json();
    results.push(`✅ Signup (${signupRes.status}): ${JSON.stringify(signupData)}`);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    results.push(`❌ Error: ${error}`);
    return NextResponse.json({ success: false, results, error: String(error) });
  }
}
