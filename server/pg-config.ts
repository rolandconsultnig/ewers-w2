/**
 * Normalize pg client/pool SSL options.
 *
 * - Newer `pg` / `pg-connection-string` can still negotiate TLS from the URL even when you
 *   pass `ssl: false`, unless SSL-related query params are removed.
 * - Loopback hosts default to no TLS (common VPS: Postgres on same machine, no SSL).
 * - Managed DBs with self-signed certs: set DATABASE_SSL_NO_VERIFY=true
 */

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

function connectionHostname(connectionString: string): string {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
}

function querySslMode(connectionString: string): string {
  const qIdx = connectionString.indexOf("?");
  if (qIdx === -1) return "";
  const params = new URLSearchParams(connectionString.slice(qIdx + 1));
  return (params.get("sslmode") || "").toLowerCase();
}

export function pgConnectionOptions(connectionString: string): {
  connectionString: string;
  ssl?: false | { rejectUnauthorized: boolean };
} {
  const q = connectionString.includes("?") ? connectionString.split("?")[1]! : "";
  const sslmode = querySslMode(connectionString);
  const pgSslMode = (process.env.PGSSLMODE || "").toLowerCase();

  const wantsNoTls =
    sslmode === "disable" ||
    pgSslMode === "disable" ||
    /(?:^|[&])ssl=false(?:&|$)/i.test(q);

  const host = connectionHostname(connectionString).toLowerCase();
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1";

  /** User explicitly wants TLS to the server (rare on loopback). */
  const strictRemoteTls =
    sslmode === "require" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full";

  if (process.env.DATABASE_SSL_NO_VERIFY === "true") {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
    };
  }

  if (wantsNoTls || (isLoopback && !strictRemoteTls)) {
    return {
      connectionString: stripSslQueryParams(connectionString),
      ssl: false,
    };
  }

  return { connectionString };
}
