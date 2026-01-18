import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { router } from "expo-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";

type MatchRow = {
  id: string;
  sport: string;
  format: string;
  status: string | null;
  played_at: string | null;
  score_text: string | null;
  winner_side: number | null;
  reported_by: string | null;
};

type MatchPlayerRow = {
  match_id: string;
  user_id: string;
  side: number;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type FilterValue = "all" | "confirmed" | "pending" | "disputed";

type FilterOption = {
  label: string;
  value: FilterValue;
};

const FILTERS: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Disputed", value: "disputed" }
];

const formatSportLabel = (sport: string) =>
  sport
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatProfileName = (profile?: Profile) =>
  profile?.full_name?.trim() || profile?.username?.trim() || "Unknown player";

const formatDate = (value: string | null) => {
  if (!value) {
    return "Unknown date";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "Unknown date"
    : parsed.toLocaleDateString();
};

const formatStatus = (status: string | null) => {
  if (!status) {
    return "Unknown";
  }
  return status.replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function MatchHistoryScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayerRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setIsLoading(false);
      router.replace("/(auth)/sign-in");
      return;
    }

    setUser(data.user);

    const { data: myPlayers, error: myPlayersError } = await supabase
      .from("match_players")
      .select("match_id, user_id, side")
      .eq("user_id", data.user.id);

    if (myPlayersError) {
      Alert.alert("Match history", myPlayersError.message);
      setMatches([]);
      setMatchPlayers([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    const matchIds = Array.from(
      new Set((myPlayers ?? []).map((row) => row.match_id))
    );

    if (matchIds.length === 0) {
      setMatches([]);
      setMatchPlayers([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    const { data: matchRows, error: matchesError } = await supabase
      .from("matches")
      .select(
        "id, sport, format, status, played_at, score_text, winner_side, reported_by"
      )
      .in("id", matchIds)
      .order("played_at", { ascending: false });

    if (matchesError) {
      Alert.alert("Match history", matchesError.message);
      setMatches([]);
      setMatchPlayers([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    const { data: playerRows, error: playersError } = await supabase
      .from("match_players")
      .select("match_id, user_id, side")
      .in("match_id", matchIds);

    if (playersError) {
      Alert.alert("Match history", playersError.message);
      setMatches([]);
      setMatchPlayers([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set((playerRows ?? []).map((row) => row.user_id))
    );

    let profileRows: Profile[] = [];

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", userIds);

      if (profileError) {
        Alert.alert("Match history", profileError.message);
        setMatches([]);
        setMatchPlayers([]);
        setProfiles([]);
        setIsLoading(false);
        return;
      }

      profileRows = profileData ?? [];
    }

    setMatches(matchRows ?? []);
    setMatchPlayers(playerRows ?? []);
    setProfiles(profileRows);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const playersByMatchId = useMemo(() => {
    const map = new Map<string, MatchPlayerRow[]>();
    matchPlayers.forEach((player) => {
      const list = map.get(player.match_id) ?? [];
      list.push(player);
      map.set(player.match_id, list);
    });
    return map;
  }, [matchPlayers]);

  const mySideByMatchId = useMemo(() => {
    const map = new Map<string, number>();
    matchPlayers.forEach((player) => {
      if (player.user_id === user?.id) {
        map.set(player.match_id, player.side);
      }
    });
    return map;
  }, [matchPlayers, user?.id]);

  const filteredMatches = useMemo(() => {
    if (filter === "all") {
      return matches;
    }
    return matches.filter((match) => match.status === filter);
  }, [filter, matches]);

  const getResultForMatch = (match: MatchRow) => {
    if (match.status !== "confirmed") {
      return "—";
    }
    const mySide = mySideByMatchId.get(match.id);
    if (!mySide || match.winner_side === null) {
      return "—";
    }
    return match.winner_side === mySide ? "W" : "L";
  };

  const getOpponentSummary = (match: MatchRow) => {
    const players = playersByMatchId.get(match.id) ?? [];
    const mySide = mySideByMatchId.get(match.id);

    if (!mySide) {
      return "Opponents: —";
    }

    const myTeam = players.filter((player) => player.side === mySide);
    const opponents = players.filter((player) => player.side !== mySide);

    if (match.format === "singles") {
      const opponent = opponents[0];
      return `Opponent: ${formatProfileName(
        opponent ? profileMap.get(opponent.user_id) : undefined
      )}`;
    }

    const partner = myTeam.find((player) => player.user_id !== user?.id);
    const partnerName = formatProfileName(
      partner ? profileMap.get(partner.user_id) : undefined
    );
    const opponentNames = opponents
      .map((opponent) => formatProfileName(profileMap.get(opponent.user_id)))
      .join(", ");

    return `Partner: ${partnerName}\nOpponents: ${opponentNames || "—"}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Match history</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadHistory}
          disabled={isLoading}
        >
          <Text style={styles.refreshText}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((option) => {
          const isActive = option.value === filter;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => setFilter(option.value)}
              style={isActive ? styles.filterButtonActive : styles.filterButton}
            >
              <Text
                style={
                  isActive ? styles.filterButtonTextActive : styles.filterButtonText
                }
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading your matches...</Text>
        </View>
      ) : filteredMatches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.subtitle}>No matches found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredMatches.map((match) => (
            <View key={match.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {formatSportLabel(match.sport)} · {match.format}
                </Text>
                <Text style={styles.cardDate}>{formatDate(match.played_at)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Score</Text>
                <Text style={styles.detailValue}>
                  {match.score_text || "—"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{formatStatus(match.status)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Result</Text>
                <Text style={styles.detailValue}>{getResultForMatch(match)}</Text>
              </View>
              <Text style={styles.opponentText}>{getOpponentSummary(match)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111"
  },
  refreshText: {
    color: "#fff",
    fontWeight: "600"
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f0f0f0"
  },
  filterButtonActive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#111"
  },
  filterButtonText: {
    color: "#111",
    fontWeight: "600"
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "600"
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 32
  },
  loadingText: {
    color: "#666"
  },
  emptyState: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center"
  },
  list: {
    gap: 16
  },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    gap: 10
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1
  },
  cardDate: {
    color: "#666"
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  detailLabel: {
    color: "#666"
  },
  detailValue: {
    fontWeight: "600"
  },
  opponentText: {
    color: "#333",
    lineHeight: 20
  }
});
