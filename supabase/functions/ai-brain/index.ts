import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const SYSTEM_PROMPT = `You are an AI sales assistant for Bhomvrat Rai's HVAC Lead Conversion Agency.
You help HVAC businesses in India convert more leads into booked appointments.
You speak in Hindi-English mix (Hinglish).
You are direct, helpful, and focused on results.
Your job: qualify leads, book demos, answer questions about the service.

Service: 24/7 AI lead response system for HVAC companies
Pricing: Starter ₹25K (one-time), Growth ₹50K, Premium ₹99K
Key benefit: Respond to missed calls and web leads in under 60 seconds
Contact: Bhomvrat Rai, 7987761789, bhomvratrai7225@gmail.com

Be conversational. Use Hindi when the customer speaks Hindi. Always push toward booking a free demo.`;

async function callGroq(messages: any[]) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "Sorry, please try again.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { message, conversation_id, user_info } = await req.json();

    // Get conversation history
    let history: any[] = [];
    if (conversation_id) {
      const { data } = await supabase
        .from("conversations")
        .select("messages")
        .eq("id", conversation_id)
        .single();
      if (data) history = data.messages || [];
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];

    const reply = await callGroq(messages);
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: reply });

    // Save conversation
    const convId = conversation_id || crypto.randomUUID();
    await supabase.from("conversations").upsert({
      id: convId,
      messages: history,
      updated_at: new Date().toISOString(),
    });

    // If lead detected, save it
    if (message.toLowerCase().includes("demo") || message.toLowerCase().includes("price") || message.toLowerCase().includes("interested")) {
      await supabase.from("leads").insert({
        name: user_info?.name || "Website Visitor",
        phone: user_info?.phone || null,
        email: user_info?.email || null,
        message: message,
        source: "chatbot",
        status: "hot",
      });
    }

    return new Response(
      JSON.stringify({ reply, conversation_id: convId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
