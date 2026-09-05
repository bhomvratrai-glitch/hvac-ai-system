import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";

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

async function classifyReply(message: string): Promise<string> {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "Classify this email reply into one of: INTERESTED, NOT_INTERESTED, QUESTION, AUTO_REPLY, UNSUBSCRIBE. Reply with just the classification.",
        },
        { role: "user", content: message },
      ],
      temperature: 0,
      max_tokens: 20,
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "QUESTION";
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = await getGmailToken();

    // Search for replies to HVAC outreach
    const searchResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=subject:"HVAC leads" is:unread newer_than:1d&maxResults=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchResp.json();
    const messages = searchData.messages || [];

    const results: any[] = [];

    for (const msg of messages) {
      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msgData = await msgResp.json();

      const fromHeader = msgData.payload?.headers?.find((h: any) => h.name === "From")?.value ?? "";
      const snippet = msgData.snippet ?? "";

      // Skip our own sent emails
      if (fromHeader.includes("bhomvratrai7225")) continue;

      const classification = await classifyReply(snippet);

      // Save to inbox_replies table
      await supabase.from("inbox_replies").upsert({
        gmail_id: msg.id,
        from_email: fromHeader,
        snippet: snippet,
        classification: classification,
        processed: false,
        received_at: new Date().toISOString(),
      });

      // If interested, create a hot lead
      if (classification === "INTERESTED") {
        await supabase.from("leads").insert({
          name: fromHeader.split("<")[0].trim(),
          email: fromHeader.match(/<(.+)>/)?.[1] ?? fromHeader,
          message: snippet,
          source: "email_reply",
          status: "hot",
        });
      }

      results.push({ from: fromHeader, classification, snippet: snippet.substring(0, 100) });
    }

    return new Response(
      JSON.stringify({ success: true, replies_processed: results.length, results }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
