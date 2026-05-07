const APP_URL = Deno.env.get("APP_URL")
const CRON_SECRET = Deno.env.get("CRON_SECRET")

Deno.serve(async () => {
  if (!APP_URL || !CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "APP_URL or CRON_SECRET not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const response = await fetch(`${APP_URL}/api/cron/email-acknowledgment`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  })
})
