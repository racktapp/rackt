import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";

type ActivityType = "match_confirmed" | "friend_added" | "rating_updated";

type ActivityRow = {
  id: string;
  created_at: string;
  actor_user_id: string;
  type: ActivityType;
  entity_type: "match" | "friendship" | "rating";
  entity_id: string | null;
  metadata: Record<string, unknown>;
};

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type GroupedActivities = {
  label: string;
  items: ActivityRow[];
};

const sportLabels: Record<string, string> = {
  tennis: "tennis",
  padel: "padel",
  badminton: "badminton",
  table_tennis: "table tennis"
};

const formatDisplayName = (profile?: ProfileRow) => {
  if (!profile) {
    return "Someone";
  }
  return profile.full_name?.trim() || profile.username?.trim() || "Someone";
};

const formatActivityText = (
  activity: ActivityRow,
  actorName: string,
  profileMap: Record<string, ProfileRow>
) => {
  if (activity.type === "friend_added") {
    const friendId = activity.metadata.friendUserId as string | undefined;
    const friendName = formatDisplayName(friendId ? profileMap[friendId] : undefined);
    return `${actorName} became friends with ${friendName}`;
  }

  if (activity.type === "match_confirmed") {
    const sport = activity.metadata.sport as string | undefined;
    const sportLabel = sport ? sportLabels[sport] ?? sport : null;
    if (sportLabel) {
      return `${actorName} confirmed a ${sportLabel} match`;
    }
    return `${actorName} confirmed a match`;
  }

  if (activity.type === "rating_updated") {
    const sport = activity.metadata.sport as string | undefined;
    const sportLabel = sport ? sportLabels[sport] ?? sport : "sport";
    const newLevel = activity.metadata.newLevel as string | number | undefined;
    if (newLevel !== undefined) {
      return `${actorName}'s ${sportLabel} rating changed to ${newLevel}`;
    }
    return `${actorName}'s ${sportLabel} rating changed`;
  }

  return `${actorName} updated their activity`;
};

const getActivityRoute = (activity: ActivityRow) => {
  if (activity.type === "match_confirmed") {
    const matchId =
      (activity.metadata.matchId as string | undefined) ?? activity.entity_id;
    if (matchId) {
      return `/(app)/match/${matchId}`;
    }
  }

  if (activity.type === "friend_added") {
    const friendId = activity.metadata.friendUserId as string | undefined;
    if (friendId) {
      return `/profile/${friendId}`;
    }
  }

  if (activity.type === "rating_updated") {
    return `/profile/${activity.actor_user_id}`;
  }

  return null;
};

const groupActivitiesByDay = (activities: ActivityRow[]): GroupedActivities[] => {
  const groups = new Map<string, ActivityRow[]>();
  activities.forEach((activity) => {
    const date = new Date(activity.created_at);
    const key = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      .toISOString()
      .slice(0, 10);
    const existing = groups.get(key) ?? [];
    existing.push(activity);
    groups.set(key, existing);
  });

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([key, items]) => ({
      label: formatDayLabel(new Date(key)),
      items
    }));
};

const formatDayLabel = (date: Date) => {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = startOfToday.getTime() - startOfDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }

  return startOfDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
};

export default function FeedScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileRow>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadFeed = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/(auth)/sign-in");
        return;
      }

      const user: User = userData.user;

      const { data: activityRows, error: activityError } = await supabase
        .from("activities")
        .select(
          "id, created_at, actor_user_id, type, entity_type, entity_id, metadata"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (activityError) {
        setErrorMessage(activityError.message);
        setActivities([]);
        setProfileMap({});
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const rows = activityRows ?? [];
      setActivities(rows);

      const profileIds = new Set<string>();
      profileIds.add(user.id);

      rows.forEach((activity) => {
        profileIds.add(activity.actor_user_id);
        const friendId = activity.metadata.friendUserId as string | undefined;
        if (friendId) {
          profileIds.add(friendId);
        }
      });

      if (profileIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name")
          .in("id", Array.from(profileIds));

        if (profilesError) {
          setErrorMessage(profilesError.message);
          setProfileMap({});
        } else {
          const nextMap: Record<string, ProfileRow> = {};
          (profilesData ?? []).forEach((profile) => {
            nextMap[profile.id] = profile;
          });
          setProfileMap(nextMap);
        }
      } else {
        setProfileMap({});
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [router]
  );

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const groupedActivities = useMemo(
    () => groupActivitiesByDay(activities),
    [activities]
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            tintColor={colors.text}
            refreshing={isRefreshing}
            onRefresh={() => loadFeed(true)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Feed</Text>
            <Text style={styles.subtitle}>Friend-only activity updates.</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading activity...</Text>
            <View style={styles.skeletonStack}>
              {[0, 1, 2].map((key) => (
                <View key={key} style={styles.skeletonCard}>
                  <View style={styles.skeletonLine} />
                  <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                </View>
              ))}
            </View>
          </View>
        ) : errorMessage ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Unable to load activity</Text>
            <Text style={styles.emptyBody}>{errorMessage}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => loadFeed()}>
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : groupedActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No friend activity yet</Text>
            <Text style={styles.emptyBody}>
              Once your friends confirm matches or update ratings, it will show up
              here.
            </Text>
          </View>
        ) : (
          groupedActivities.map((group) => (
            <View key={group.label} style={styles.groupSection}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              {group.items.map((activity) => {
                const actorName = formatDisplayName(profileMap[activity.actor_user_id]);
                const activityText = formatActivityText(
                  activity,
                  actorName,
                  profileMap
                );
                const route = getActivityRoute(activity);
                const isPressable = Boolean(route);

                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.activityCard,
                      isPressable ? styles.activityCardPressable : null
                    ]}
                    activeOpacity={0.8}
                    disabled={!isPressable}
                    onPress={() => {
                      if (route) {
                        router.push(route);
                      }
                    }}
                  >
                    <View style={styles.activityRow}>
                      <Text style={styles.activityText}>{activityText}</Text>
                      <Text style={styles.activityTime}>
                        {formatTime(activity.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg
    },
    container: {
      padding: 24,
      paddingBottom: 120,
      gap: 16
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted,
      marginTop: 4,
      maxWidth: 260
    },
    loadingState: {
      gap: 12,
      alignItems: "flex-start"
    },
    loadingText: {
      color: colors.muted
    },
    skeletonStack: {
      width: "100%",
      gap: 12
    },
    skeletonCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 8
    },
    skeletonLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.cardAlt
    },
    skeletonLineShort: {
      width: "60%"
    },
    groupSection: {
      gap: 10
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text
    },
    activityCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    activityCardPressable: {
      shadowColor: colors.border,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8
    },
    activityRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12
    },
    activityText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: "600"
    },
    activityTime: {
      color: colors.muted,
      fontSize: 12
    },
    emptyState: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600"
    },
    emptyBody: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20
    },
    secondaryButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardAlt
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600"
    }
  });
