import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type NotificationPermission =
  | "granted"
  | "denied"
  | "undetermined";

export const setNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false
    })
  });
};

export const registerForPushAsync = async (): Promise<{
  token: string | null;
  permission: NotificationPermission;
}> => {
  if (Platform.OS === "web") {
    return { token: null, permission: "denied" };
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const requestStatus = await Notifications.requestPermissionsAsync();
    finalStatus = requestStatus.status;
  }

  if (finalStatus !== "granted") {
    return { token: null, permission: finalStatus };
  }

  if (!Device.isDevice) {
    return { token: null, permission: finalStatus };
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId
  });

  return { token: tokenResponse.data, permission: finalStatus };
};

export const addNotificationListeners = (
  onResponse: (response: Notifications.NotificationResponse) => void
): Array<() => void> => {
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener(onResponse);
  const receivedSubscription =
    Notifications.addNotificationReceivedListener(() => undefined);

  return [
    () => responseSubscription.remove(),
    () => receivedSubscription.remove()
  ];
};

export const parseNotificationData = (
  response: Notifications.NotificationResponse
): { type: "friend_request" | "match_confirmation"; targetId?: string } => {
  const data = response.notification.request.content.data ?? {};
  const rawType = typeof data.type === "string" ? data.type : null;
  const type = rawType === "match_confirmation" ? rawType : "friend_request";
  const matchId = typeof data.matchId === "string" ? data.matchId : undefined;
  const requestId =
    typeof data.requestId === "string" ? data.requestId : undefined;

  if (type === "match_confirmation") {
    return { type, targetId: matchId };
  }

  return { type, targetId: requestId };
};
