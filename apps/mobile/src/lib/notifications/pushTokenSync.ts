import { supabase } from "../../../lib/supabase";

type PlatformType = "ios" | "android" | "web";

type TokenPayload = {
  token: string;
  platform: PlatformType;
  deviceId?: string | null;
};

export const upsertDeviceToken = async ({
  token,
  platform,
  deviceId
}: TokenPayload): Promise<void> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return;
  }

  const { error: upsertError } = await supabase
    .from("device_push_tokens")
    .upsert(
      {
        expo_push_token: token,
        user_id: data.user.id,
        platform,
        device_id: deviceId ?? null,
        enabled: true
      },
      { onConflict: "expo_push_token" }
    );

  if (upsertError) {
    console.warn("Failed to sync push token", upsertError.message);
  }
};

export const disableDeviceTokensForUser = async (): Promise<void> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return;
  }

  const { error: updateError } = await supabase
    .from("device_push_tokens")
    .update({ enabled: false })
    .eq("user_id", data.user.id);

  if (updateError) {
    console.warn("Failed to disable push tokens", updateError.message);
  }
};

export const setTokenEnabled = async (
  token: string,
  enabled: boolean
): Promise<void> => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return;
  }

  const { error: updateError } = await supabase
    .from("device_push_tokens")
    .update({ enabled })
    .eq("expo_push_token", token);

  if (updateError) {
    console.warn("Failed to update push token", updateError.message);
  }
};
