import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";

type SportKey = "tennis" | "padel" | "badminton";

type Leaderboard = {
  id: string;
  name: string;
  sport: SportKey;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type Rating = {
  user_id: string;
  level: number | null;
  reliability: number | null;
};

type RankedMember = Profile & {
  level: number | null;
  reliability: number | null;
};

const sportLabels: Record<SportKey, string> = {
  tennis: "Tennis",
  padel: "Padel",
  badminton: "Badminton"
};

const formatProfileName = (profile: Profile) =>
  profile.full_name?.trim() || profile.username?.trim() || "Unknown player";

const memberSort = (a: RankedMember, b: RankedMember) => {
  const aLevel = a.level ?? null;
  const bLevel = b.level ?? null;
  if (aLevel === null && bLevel !== null) {
    return 1;
  }
  if (aLevel !== null && bLevel === null) {
    return -1;
  }
  if (aLevel !== null && bLevel !== null && aLevel !== bLevel) {
    return bLevel - aLevel;
  }
  const aReliability = a.reliability ?? null;
  const bReliability = b.reliability ?? null;
  if (aReliability !== null && bReliability !== null && aReliability !== bReliability) {
    return bReliability - aReliability;
  }
  return formatProfileName(a).localeCompare(formatProfileName(b));
};

export default function LeaderboardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ leaderboardId?: string | string[] }>();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [members, setMembers] = useState<RankedMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const leaderboardId =
    typeof params.leaderboardId === "string"
      ? params.leaderboardId
      : params.leaderboardId?.[0];

  const loadLeaderboard = useCallback(
    async (isPullRefresh = false) => {
      if (!leaderboardId) {
        router.replace("/(tabs)");
        return;
      }

      if (isPullRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const { data: leaderboardRow, error: leaderboardError } = await supabase
        .from("leaderboards")
        .select("id, name, sport")
        .eq("id", leaderboardId)
        .single();

      if (leaderboardError || !leaderboardRow) {
        setErrorMessage(leaderboardError?.message ?? "Unable to load leaderboard.");
        setLeaderboard(null);
        setMembers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const { data: memberRows, error: memberError } = await supabase
        .from("leaderboard_members")
        .select("user_id")
        .eq("leaderboard_id", leaderboardId);

      if (memberError) {
        setErrorMessage(memberError.message);
        setLeaderboard(leaderboardRow);
        setMembers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const memberIds = (memberRows ?? []).map((row) => row.user_id);

      if (memberIds.length === 0) {
        setLeaderboard(leaderboardRow);
        setMembers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", memberIds);

      if (profilesError) {
        setErrorMessage(profilesError.message);
        setLeaderboard(leaderboardRow);
        setMembers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const { data: ratingRows, error: ratingsError } = await supabase
        .from("sport_ratings")
        .select("user_id, level, reliability")
        .eq("sport", leaderboardRow.sport)
        .in("user_id", memberIds);

      if (ratingsError) {
        setErrorMessage(ratingsError.message);
        setLeaderboard(leaderboardRow);
        setMembers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const ratingsMap = new Map<string, Rating>();
      (ratingRows ?? []).forEach((rating) => {
        ratingsMap.set(rating.user_id, rating);
      });

      const mergedMembers = (profileRows ?? []).map((profile) => {
        const rating = ratingsMap.get(profile.id);
        return {
          ...profile,
          level: rating?.level ?? null,
          reliability: rating?.reliability ?? null
        };
      });

      mergedMembers.sort(memberSort);

      setLeaderboard(leaderboardRow);
      setMembers(mergedMembers);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [leaderboardId, router]
  );

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  if (isLoading && !leaderboard) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadLeaderboard(true)}
            tintColor={colors.text}
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{leaderboard?.name ?? "Leaderboard"}</Text>
            <Text style={styles.subtitle}>
              {leaderboard?.sport
                ? `${sportLabels[leaderboard.sport]} rankings`
                : "Rankings"}
            </Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Unable to load rankings</Text>
            <Text style={styles.emptyBody}>{errorMessage}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => loadLeaderboard()}>
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyState}
          >
            <Text style={styles.emptyTitle}>No members yet</Text>
            <Text style={styles.emptyBody}>
              Invite friends to start tracking ratings.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {members.map((member, index) => (
              <View key={member.id} style={styles.listRow}>
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{formatProfileName(member)}</Text>
                  <Text style={styles.memberMeta}>
                    Level {member.level ?? "—"} · Reliability {member.reliability ?? "—"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background
    },
    container: {
      padding: 24,
      paddingBottom: 120,
      gap: 20
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
      textTransform: "capitalize"
    },
    backButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border
    },
    backButtonText: {
      color: colors.text,
      fontWeight: "600"
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12
    },
    loadingText: {
      color: colors.muted
    },
    emptyState: {
      padding: 24,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 8
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text
    },
    emptyBody: {
      color: colors.muted,
      lineHeight: 20
    },
    secondaryButton: {
      marginTop: 16,
      alignSelf: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14
    },
    list: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12
    },
    rank: {
      width: 24,
      textAlign: "center",
      color: colors.muted,
      fontWeight: "700"
    },
    memberInfo: {
      flex: 1
    },
    memberName: {
      color: colors.text,
      fontWeight: "600"
    },
    memberMeta: {
      color: colors.muted,
      marginTop: 2
    }
  });
