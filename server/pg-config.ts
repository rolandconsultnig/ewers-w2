/**
 * Normalize pg Pool/Client SSL options.
 *
 * Passing `{ connectionString, ssl: false }` is not always respected by `pg`; the driver
 * may still parse SSL from the URL. Building an explicit ClientConfig via
 * `parseIntoClientConfig` and then setting `ssl: false` avoids TLS entirely.
 *
 * Managed DBs with self-signed certs: DATABASE_SSL_NO_VERIFY=true
 */

import type { PoolConfig } from "pg";
import { parse, parseIntoClientConfig } from "pg-connection-string";

const SSL_QUERY_KEYS = [
  "sslmode",
  "ssl",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslpassword",
];

function stripSslQueryParams(connectionString: string): string {
  const qIdx = connectionString.indexOf("?");
  if (qIdx === -1) return connectionString;
  const base = connectionString.slice(0, qIdx);
  const query = connectionString.slice(qIdx + 1);
  const params = new URLSearchParams(query);
  for (const k of SSL_QUERY_KEYS) params.delete(k);
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

function querySslMode(connectionString: string): string {
  const qIdx = connectionString.indexOf("?");
  if (qIdx === -1) return "";
  const params = new URLSearchParams(connectionString.slice(qIdx + 1));
  return (params.get("sslmode") || "").toLowerCase();
}

/** Remove URL-derived SSL fields so they are not forwarded as client settings. */
function stripSslFieldsFromConfig(cfg: PoolConfig): PoolConfig {
  const next = { ...cfg };
  for (const k of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "sslpassword",
  ] as const) {
    delete (next as Record<string, unknown>)[k];
  }
  return next;
}

export function pgConnectionOptions(connectionString: string): PoolConfig {
  const q = connectionString.includes("?") ? connectionString.split("?")[1]! : "";
  const sslmode = querySslMode(connectionString);
  const pgSslMode = (process.env.PGSSLMODE || "").toLowerCase();

  const wantsNoTls =
    sslmode === "disable" ||
    pgSslMode === "disable" ||
    /(?:^|[&])ssl=false(?:&|$)/i.test(q);

  const host = (parse(connectionString).host || "").toLowerCase();
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1";

  const strictRemoteTls =
    sslmode === "require" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full";

  if (process.env.DATABASE_SSL_NO_VERIFY === "true") {
    const cfg = stripSslFieldsFromConfig(parseIntoClientConfig(connectionString));
    return {
      ...cfg,
      ssl: { rejectUnauthorized: false },
    };
  }

  if (wantsNoTls || (isLoopback && !strictRemoteTls)) {
    const stripped = stripSslQueryParams(connectionString);
    const cfg = stripSslFieldsFromConfig(parseIntoClientConfig(stripped));
    return {
      ...cfg,
      ssl: false,
    };
  }

  return { connectionString };
}
