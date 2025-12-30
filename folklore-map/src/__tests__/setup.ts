import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:54322/postgres";

// Mock fetch globally
global.fetch = vi.fn();
