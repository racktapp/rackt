import { router, useLocalSearchParams } from "expo-router";
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
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../../lib/supabase";

type MatchRow = {
  id: string;
  sport: string;
  format: string;
  is_ranked: boolean | null;
  status: string | null;
  reported_by: string | null;
  played_at: string | null;
  score_text: string | null;
};

type MatchPlayerRow = {
  match_id: string;
  user_id: string;
  side: number;
};

type ConfirmationRow = {
  match_id: string;
  user_id: string;
  status: string;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

const formatProfileName = (profile: Profile) =>
  profile.full_name?.trim() || profile.username?.trim() || "Unknown player";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Unknown date";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "Unknown date"
    : parsed.toLocaleString();
};

export default function MatchDetailScreen() {
  const params = useLocalSearchParams();
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [user, setUser] = useState<User | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [players, setPlayers] = useState<MatchPlayerRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [confirmations, setConfirmations] = useState<ConfirmationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadMatch = useCallback(async () => {
    if (!matchId || typeof matchId !== "string") {
      Alert.alert("Match not found", "Invalid match id.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setIsLoading(false);
      router.replace("/(auth)/sign-in");
      return;
    }

    setUser(data.user);

    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .select("id, sport, format, is_ranked, status, reported_by, played_at, score_text")
      .eq("id", matchId)
      .single();

    if (matchError || !matchRow) {
      Alert.alert("Match error", matchError?.message ?? "Unable to load match.");
      setIsLoading(false);
      return;
    }

    const { data: matchPlayers, error: playersError } = await supabase
      .from("match_players")
      .select("match_id, user_id, side")
      .eq("match_id", matchId);

    if (playersError) {
      Alert.alert("Match error", playersError.message);
      setIsLoading(false);
      return;
    }

    const playerIds = Array.from(
      new Set((matchPlayers ?? []).map((row) => row.user_id))
    );

    let profileRows: Profile[] = [];

    if (playerIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", playerIds);

      if (profileError) {
        Alert.alert("Match error", profileError.message);
        setIsLoading(false);
        return;
      }

      profileRows = profileData ?? [];
    }

    const { data: confirmationRows, error: confirmationsError } = await supabase
      .from("match_confirmations")
      .select("match_id, user_id, status")
      .eq("match_id", matchId);

    if (confirmationsError) {
      Alert.alert("Match error", confirmationsError.message);
      setIsLoading(false);
      return;
    }

    setMatch(matchRow);
    setPlayers(matchPlayers ?? []);
    setProfiles(profileRows);
    setConfirmations(confirmationRows ?? []);
    setIsLoading(false);

    if (matchRow.reported_by === data.user.id) {
      const hasDisputed = (confirmationRows ?? []).some(
        (row) => row.status === "disputed"
      );
      const allConfirmed =
        (confirmationRows ?? []).length > 0 &&
        (confirmationRows ?? []).every((row) => row.status === "confirmed");
      let nextStatus = matchRow.status;

      if (hasDisputed) {
        nextStatus = "disputed";
      } else if (allConfirmed && matchRow.is_ranked) {
        nextStatus = "confirmed";
      }

      if (nextStatus && nextStatus !== matchRow.status) {
        const { error: statusError } = await supabase
          .from("matches")
          .update({ status: nextStatus })
          .eq("id", matchRow.id);

        if (!statusError) {
          setMatch((current) =>
            current ? { ...current, status: nextStatus } : current
          );
        }
      }
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const teamOne = useMemo(
    () => players.filter((player) => player.side === 1),
    [players]
  );
  const teamTwo = useMemo(
    () => players.filter((player) => player.side === 2),
    [players]
  );

  const userConfirmation = useMemo(
    () => confirmations.find((row) => row.user_id === user?.id),
    [confirmations, user]
  );

  const handleUpdateConfirmation = async (status: "confirmed" | "disputed") => {
    if (!user || !matchId || typeof matchId !== "string") {
      return;
    }

    setIsUpdating(true);

    const { error } = await supabase
      .from("match_confirmations")
      .update({ status })
      .eq("match_id", matchId)
      .eq("user_id", user.id);

    if (error) {
      Alert.alert("Update failed", error.message);
      setIsUpdating(false);
      return;
    }

    await loadMatch();
    setIsUpdating(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Match details</Text>

      {isLoading || !match ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading match...</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{match.sport}</Text>
            <Text style={styles.cardMeta}>{match.format}</Text>
            <Text style={styles.cardMeta}>{formatDateTime(match.played_at)}</Text>
            <Text style={styles.cardScore}>
              {match.score_text || "Score not provided"}
            </Text>
            <Text style={styles.cardStatus}>
              Status: {match.status ?? "pending"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team 1</Text>
            {teamOne.map((player) => (
              <Text key={player.user_id} style={styles.playerName}>
                {formatProfileName(
                  profileMap.get(player.user_id) ?? {
                    id: player.user_id,
                    username: null,
                    full_name: null
                  }
                )}
              </Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team 2</Text>
            {teamTwo.map((player) => (
              <Text key={player.user_id} style={styles.playerName}>
                {formatProfileName(
                  profileMap.get(player.user_id) ?? {
                    id: player.user_id,
                    username: null,
                    full_name: null
                  }
                )}
              </Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Confirmations</Text>
            {confirmations.map((confirmation) => (
              <View key={confirmation.user_id} style={styles.confirmationRow}>
                <Text style={styles.playerName}>
                  {formatProfileName(
                    profileMap.get(confirmation.user_id) ?? {
                      id: confirmation.user_id,
                      username: null,
                      full_name: null
                    }
                  )}
                </Text>
                <Text style={styles.confirmationStatus}>
                  {confirmation.status}
                </Text>
              </View>
            ))}
          </View>

          {userConfirmation?.status === "pending" ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => handleUpdateConfirmation("confirmed")}
                disabled={isUpdating}
              >
                <Text style={styles.actionButtonText}>
                  {isUpdating ? "Updating..." : "Confirm"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.disputeButton]}
                onPress={() => handleUpdateConfirmation("disputed")}
                disabled={isUpdating}
              >
                <Text style={styles.actionButtonText}>Dispute</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
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
  title: {
    fontSize: 26,
    fontWeight: "700"
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
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    gap: 6
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  cardMeta: {
    color: "#666"
  },
  cardScore: {
    fontWeight: "600"
  },
  cardStatus: {
    color: "#333"
  },
  section: {
    gap: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600"
  },
  playerName: {
    fontSize: 15,
    fontWeight: "600"
  },
  confirmationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  confirmationStatus: {
    color: "#666",
    textTransform: "capitalize"
  },
  actionRow: {
    flexDirection: "row",
    gap: 12
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  confirmButton: {
    backgroundColor: "#111"
  },
  disputeButton: {
    backgroundColor: "#b00020"
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600"
  }
});
