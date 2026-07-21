import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    // CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    console.log("========== AI CHAT ==========");

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.error("Authorization header missing");
      return Response.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("JWT INVALID", authError);

      return Response.json(
        {
          error: "Invalid session",
        },
        {
          status: 401,
        },
      );
    }

    console.log("User:", user.id);

    const body = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return Response.json(
        {
          error: "messages required",
        },
        {
          status: 400,
        },
      );
    }

    const GOOGLE_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const XAI_KEY = Deno.env.get("XAI_API_KEY");

    if (!GOOGLE_KEY && !XAI_KEY) {
      return Response.json(
        {
          error: "No AI Keys configured",
        },
        {
          status: 500,
        },
      );
    }

    //---------------------------------------------------
    // GEMINI
    //---------------------------------------------------

    if (GOOGLE_KEY) {
      try {
        console.log("Trying Gemini...");

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: body.messages.map((m: any) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [
                  {
                    text: m.content,
                  },
                ],
              })),
            }),
          },
        );

        const raw = await response.text();

        console.log(raw);

        if (response.ok) {
          const json = JSON.parse(raw);

          const text =
            json?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (text) {
            console.log("Gemini OK");

            return Response.json({
              provider: "gemini",
              content: text,
            });
          }
        }

        console.error("Gemini Failed");
      } catch (err) {
        console.error("Gemini Exception");
        console.error(err);
      }
    }

    //---------------------------------------------------
    // GROK
    //---------------------------------------------------

    if (XAI_KEY) {
      try {
        console.log("Trying Grok...");

        const response = await fetch(
          "https://api.x.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${XAI_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "grok-3",
              messages: body.messages,
            }),
          },
        );

        const raw = await response.text();

        console.log(raw);

        if (response.ok) {
          const json = JSON.parse(raw);

          const text =
            json?.choices?.[0]?.message?.content;

          if (text) {
            console.log("Grok OK");

            return Response.json({
              provider: "grok",
              content: text,
            });
          }
        }

        console.error("Grok Failed");
      } catch (err) {
        console.error(err);
      }
    }

    return Response.json(
      {
        error: "All AI providers failed",
      },
      {
        status: 502,
      },
    );
  } catch (err) {
    console.error("Fatal Error");
    console.error(err);

    return Response.json(
      {
        error: String(err),
      },
      {
        status: 500,
      },
    );
  }
});
