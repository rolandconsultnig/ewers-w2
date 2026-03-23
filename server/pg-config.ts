/**
 * Normalize pg client/pool SSL options. Newer `pg` + connection-string parsing can still
 * attempt TLS even with sslmode=disable in the URL, causing SELF_SIGNED_CERT_IN_CHAIN on
 * localhost or plain Postgres. Explicit `ssl: false` disables TLS entirely.
 */
export function pgConnectionOptions(connectionString: string): {
  connectionString: string;
  ssl?: false | { rejectUnauthorized: boolean };
} {
  const q = connectionString.includes("?") ? connectionString.split("?")[1]! : "";
  const params = new URLSearchParams(q);
  const sslmode = (params.get("sslmode") || "").toLowerCase();

  const wantsNoTls =
    sslmode === "disable" ||
    /(?:^|[&])ssl=false(?:&|$)/i.test(q);

  if (wantsNoTls) {
    return { connectionString, ssl: false };
  }

  if (process.env.DATABASE_SSL_NO_VERIFY === "true") {
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }

  return { connectionString };
}
