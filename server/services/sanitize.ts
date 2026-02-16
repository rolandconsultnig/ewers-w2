/**
 * Input Sanitization - XSS and injection prevention
 */
import xss from "xss";

export function sanitizeString(input: unknown): string {
  if (input == null) return "";
  const str = String(input);
  return xss(str, { whiteList: {}, stripIgnoreTag: true });
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[key] = sanitizeString(val);
    } else if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      (result as Record<string, unknown>)[key] = val.map((v) =>
        typeof v === "string" ? sanitizeString(v) : v
      );
    }
  }
  return result;
}

export function sanitizeForSql(input: string): string {
  return input.replace(/['";\\]/g, "");
}
