import { ZodError } from "zod";

// deno-lint-ignore no-explicit-any
export function jsonResponse(response: any, statusCode = 200): Response {
  const rp = new Response(JSON.stringify(response), {
    status: statusCode,
  });

  rp.headers.append("Content-Type", "application/json");
  return rp;
}

export function validationError(error: ZodError, location: string): Response {
  return jsonResponse({
    error: (error.issues.map((z) => z.message).join(", ")).replaceAll(
      /string/gim,
      location,
    ) + " (at " + location+")" ,
  }, 400);
}