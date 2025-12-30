import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ErrorOptions = {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
};

export function jsonResponse<T>(data: T, init: number | ResponseInit = 200) {
  const responseInit: ResponseInit =
    typeof init === "number" ? { status: init } : init;
  return NextResponse.json({ data }, responseInit);
}

export function errorResponse(
  message: string,
  { status = 400, code = "ERROR", details }: ErrorOptions = {}
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function zodErrorResponse(error: ZodError) {
  return errorResponse("入力値が不正です。", {
    status: 400,
    code: "VALIDATION_ERROR",
    details: {
      errors: error.issues.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    },
  });
}
