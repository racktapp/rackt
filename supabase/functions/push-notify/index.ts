import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type PushEventPayload = {
  event_type: "friend_request" | "match_confirmation";
  recipient_user_id: string;
  actor_user_id?: string | null;
  match_id?: string | null;
  request_id?: string | null;
};

type ProfileRow = {
  username: string | null;
  full_name: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const expoEndpoint = "https://exp.host/--/api/v2/push/send";
const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

const resolveActorName = async (actorUserId?: string | null) => {
  if (!actorUserId) {
    return "Someone";
  }

  const { data } = await supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", actorUserId)
    .maybeSingle<ProfileRow>();

  return data?.username || data?.full_name || "Someone";
};

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: PushEventPayload;

  try {
    payload = (await request.json()) as PushEventPayload;
  } catch (error) {
    console.error("push-notify: invalid payload", error);
    return new Response("Invalid payload", { status: 400 });
  }

  if (!payload.recipient_user_id) {
    return new Response("Missing recipient_user_id", { status: 400 });
  }

  const { data: tokens, error: tokensError } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("user_id", payload.recipient_user_id)
    .eq("enabled", true);

  if (tokensError) {
    console.error("push-notify: token lookup failed", tokensError);
    return new Response("Token lookup failed", { status: 500 });
  }

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ delivered: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  const actorName = await resolveActorName(payload.actor_user_id);

  const messageBase =
    payload.event_type === "match_confirmation"
      ? {
          title: "Match needs confirmation",
          body: `${actorName} reported a match — confirm it`
        }
      : {
          title: "New friend request",
          body: `${actorName} sent you a friend request`
        };

  const dataPayload = {
    type: payload.event_type,
    matchId: payload.match_id ?? undefined,
    requestId: payload.request_id ?? undefined
  };

  const messages = tokens.map((token) => ({
    to: token.expo_push_token,
    ...messageBase,
    data: dataPayload
  }));

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    const response = await fetch(expoEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("push-notify: Expo push failed", response.status, text);
    }
  } catch (error) {
    console.error("push-notify: Expo request error", error);
  }

  return new Response(JSON.stringify({ delivered: messages.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
