import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { supabase } from "../../lib/supabase";
import {
  addNotificationListeners,
  parseNotificationData,
  registerForPushAsync,
  setNotificationHandler
} from "../lib/notifications/notifications";
import {
  disableDeviceTokensForUser,
  upsertDeviceToken
} from "../lib/notifications/pushTokenSync";
import { useSettings } from "./SettingsProvider";

const resolveDeviceId = (): string | null => {
  return (
    Device.osInternalBuildId ??
    Device.osBuildId ??
    Device.modelId ??
    Device.deviceName ??
    null
  );
};

export default function PushNotificationManager() {
  const { settings } = useSettings();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    setNotificationHandler();

    const unsubscribers = addNotificationListeners((response) => {
      const parsed = parseNotificationData(response);

      if (parsed.type === "friend_request") {
        router.push("/(tabs)/friends?tab=requests");
        return;
      }

      if (parsed.targetId) {
        router.push(`/(tabs)/match/${parsed.targetId}`);
        return;
      }

      router.push("/(tabs)/pending");
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      setUserId(data.user?.id ?? null);
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    if (!userId) {
      return;
    }

    if (!settings.pushNotifications) {
      void disableDeviceTokensForUser();
      return;
    }

    const syncToken = async () => {
      const { token, permission } = await registerForPushAsync();
      if (permission !== "granted" || !token) {
        return;
      }

      const platform =
        Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";

      await upsertDeviceToken({
        token,
        platform,
        deviceId: resolveDeviceId()
      });
    };

    void syncToken();
  }, [settings.pushNotifications, userId]);

  return null;
}
