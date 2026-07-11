export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ success: false, message: "Method not allowed." }));
  }

  const configured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VAULT_SUPABASE_SERVICE_ROLE_KEY);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    success: true,
    service: "a-plus-vault",
    storage: configured ? "supabase" : "unconfigured",
    // Capture counts live in Supabase; health stays cheap/no-DB for uptime probes.
    captures: null
  }));
}
