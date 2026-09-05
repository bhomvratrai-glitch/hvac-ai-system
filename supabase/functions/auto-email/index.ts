import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";

const EMAIL_TEMPLATES = {
  day0: {
    subject: "Quick question about your HVAC leads",
    body: (name: string) => `Hi ${name},\n\nMany HVAC companies lose jobs because missed calls and web leads don't get a fast reply. We help HVAC businesses respond in under a minute and book more qualified jobs.\n\nWorth a quick look?\n\nBhomvrat Rai\n7987761789\nbhomvratrai7225@gmail.com`,
  },
  day2: {
    subject: "Re: Quick question about your HVAC leads",
    body: (name: string) => `Hi ${name},\n\nJust following up — even 2-3 extra booked jobs a month can make this worthwhile.\n\nHappy to show you a quick demo if useful.\n\nBhomvrat`,
  },
  day5: {
    subject: "Re: Quick question about your HVAC leads",
    body: (name: string) => `Hi ${name},\n\nIf useful, I can share the 3 most common HVAC lead leaks we usually see. Takes 2 minutes.\n\nBhomvrat`,
  },
  day8: {
    subject: "Re: Quick question about your HVAC leads",
    body: (name: string) => `Hi ${name},\n\nClosing the loop for now. Happy to share the audit if improving response time becomes a priority later.\n\nBest,\nBhomvrat`,
  },
};

async function getGmailToken() {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await resp.json();
  return data.access_token;
}

async function sendEmail(accessToken: string, to: string, subject: string, body: string, threadId?: string) {
  const raw = btoa(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const payload: any = { raw };
  if (threadId) payload.threadId = threadId;

  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const { data: prospects } = await supabase
      .from("prospects")
      .select("*")
      .in("outreach_status", ["not_started", "day0_sent", "day2_sent", "day5_sent"])
      .not("email", "is", null);

    if (!prospects?.length) {
      return new Response(JSON.stringify({ message: "No emails to send" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = await getGmailToken();
    let sent = 0;

    for (const p of prospects) {
      const daysSinceOutreach = p.last_email_date
        ? Math.floor((now.getTime() - new Date(p.last_email_date).getTime()) / 86400000)
        : 999;

      let template: any = null;
      let newStatus = p.outreach_status;

      if (p.outreach_status === "not_started") {
        template = EMAIL_TEMPLATES.day0;
        newStatus = "day0_sent";
      } else if (p.outreach_status === "day0_sent" && daysSinceOutreach >= 2) {
        template = EMAIL_TEMPLATES.day2;
        newStatus = "day2_sent";
      } else if (p.outreach_status === "day2_sent" && daysSinceOutreach >= 3) {
        template = EMAIL_TEMPLATES.day5;
        newStatus = "day5_sent";
      } else if (p.outreach_status === "day5_sent" && daysSinceOutreach >= 3) {
        template = EMAIL_TEMPLATES.day8;
        newStatus = "completed";
      }

      if (template && p.email) {
        const name = p.owner_name || "there";
        await sendEmail(token, p.email, template.subject, template.body(name), p.gmail_thread_id);
        await supabase.from("prospects").update({
          outreach_status: newStatus,
          last_email_date: now.toISOString(),
        }).eq("id", p.id);
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, emails_sent: sent }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
