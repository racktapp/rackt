import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  winner_side: number | null;
  rating_applied: boolean | null;
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

type SportRatingHistoryRow = {
  match_id: string;
  user_id: string;
  level_before: number | null;
  level_after: number | null;
  delta: number | null;
  reliability_after: number | null;
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
  const [ratingHistory, setRatingHistory] = useState<SportRatingHistoryRow[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWinnerUpdating, setIsWinnerUpdating] = useState(false);
  const isFinalizingRef = useRef(false);

  const getConfirmationState = (rows: ConfirmationRow[]) => {
    const hasDisputed = rows.some((row) => row.status === "disputed");
    const allConfirmed =
      rows.length > 0 && rows.every((row) => row.status === "confirmed");
    return { hasDisputed, allConfirmed };
  };

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
      .select(
        "id, sport, format, is_ranked, status, reported_by, played_at, score_text, winner_side, rating_applied"
      )
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

    let ratingHistoryRows: SportRatingHistoryRow[] = [];

    if (matchRow.rating_applied) {
      const { data: ratingData, error: ratingError } = await supabase
        .from("sport_rating_history")
        .select(
          "match_id, user_id, level_before, level_after, delta, reliability_after"
        )
        .eq("match_id", matchId);

      if (ratingError) {
        Alert.alert("Match error", ratingError.message);
        setIsLoading(false);
        return;
      }

      ratingHistoryRows = ratingData ?? [];
    }

    setMatch(matchRow);
    setPlayers(matchPlayers ?? []);
    setProfiles(profileRows);
    setConfirmations(confirmationRows ?? []);
    setRatingHistory(ratingHistoryRows);
    setIsLoading(false);

    if (matchRow.reported_by === data.user.id) {
      const { hasDisputed, allConfirmed } = getConfirmationState(
        confirmationRows ?? []
      );

      if (hasDisputed && matchRow.status !== "disputed") {
        const { error: statusError } = await supabase
          .from("matches")
          .update({ status: "disputed" })
          .eq("id", matchRow.id);

        if (!statusError) {
          setMatch((current) =>
            current ? { ...current, status: "disputed" } : current
          );
        }
      } else if (
        allConfirmed &&
        matchRow.is_ranked &&
        !matchRow.rating_applied &&
        !isFinalizingRef.current
      ) {
        isFinalizingRef.current = true;
        const { error: finalizeError } = await supabase.rpc("finalize_match", {
          match_id: matchRow.id
        });

        if (finalizeError) {
          Alert.alert("Finalize failed", finalizeError.message);
        } else {
          const { data: refreshedMatch, error: refreshError } = await supabase
            .from("matches")
            .select(
              "id, sport, format, is_ranked, status, reported_by, played_at, score_text, winner_side, rating_applied"
            )
            .eq("id", matchRow.id)
            .single();

          if (refreshError) {
            Alert.alert("Match error", refreshError.message);
          } else if (refreshedMatch) {
            setMatch(refreshedMatch);

            if (refreshedMatch.rating_applied) {
              const { data: ratingData, error: ratingError } = await supabase
                .from("sport_rating_history")
                .select(
                  "match_id, user_id, level_before, level_after, delta, reliability_after"
                )
                .eq("match_id", refreshedMatch.id);

              if (ratingError) {
                Alert.alert("Match error", ratingError.message);
              } else {
                setRatingHistory(ratingData ?? []);
              }
            } else {
              setRatingHistory([]);
            }
          }
        }

        isFinalizingRef.current = false;
      }
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const ratingHistoryMap = useMemo(() => {
    return new Map(ratingHistory.map((row) => [row.user_id, row]));
  }, [ratingHistory]);

  const teamOne = useMemo(
    () => players.filter((player) => player.side === 1),
    [players]
  );
  const teamTwo = useMemo(
    () => players.filter((player) => player.side === 2),
    [players]
  );

  const { allConfirmed } = useMemo(
    () => getConfirmationState(confirmations),
    [confirmations]
  );

  const isReporter = match?.reported_by === user?.id;
  const winnerLabel =
    match?.winner_side === 1
      ? "Team 1"
      : match?.winner_side === 2
      ? "Team 2"
      : "Not set";
  const canEditWinner =
    Boolean(isReporter) &&
    (match?.status ?? "pending") === "pending" &&
    !match?.rating_applied &&
    !allConfirmed;

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

  const handleWinnerChange = async (side: 1 | 2) => {
    if (!matchId || typeof matchId !== "string") {
      return;
    }

    setIsWinnerUpdating(true);

    const { error } = await supabase
      .from("matches")
      .update({ winner_side: side })
      .eq("id", matchId);

    if (error) {
      Alert.alert("Update failed", error.message);
      setIsWinnerUpdating(false);
      return;
    }

    setMatch((current) =>
      current ? { ...current, winner_side: side } : current
    );
    setIsWinnerUpdating(false);
  };

  const formatSignedDelta = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return "—";
    }
    const formatted = Math.abs(value).toFixed(2);
    return `${value >= 0 ? "+" : "-"}${formatted}`;
  };

  const formatLevel = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return "—";
    }
    return value.toFixed(1);
  };

  const formatReliability = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return "—";
    }
    const normalized = value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
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
            <Text style={styles.cardMeta}>Winner: {winnerLabel}</Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Winner</Text>
            <Text style={styles.helperText}>Selected: {winnerLabel}</Text>
            {canEditWinner ? (
              <View style={styles.actionRow}>
                {[1, 2].map((side) => {
                  const isActive = match.winner_side === side;
                  return (
                    <TouchableOpacity
                      key={`winner-${side}`}
                      style={[
                        styles.winnerButton,
                        isActive && styles.winnerButtonActive
                      ]}
                      onPress={() => handleWinnerChange(side as 1 | 2)}
                      disabled={isWinnerUpdating}
                    >
                      <Text
                        style={[
                          styles.winnerButtonText,
                          isActive && styles.winnerButtonTextActive
                        ]}
                      >
                        Team {side}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ratings update</Text>
            {!match.is_ranked ? (
              <Text style={styles.helperText}>
                This match was not ranked.
              </Text>
            ) : !match.rating_applied ? (
              <Text style={styles.helperText}>
                Ratings will update after everyone confirms.
              </Text>
            ) : (
              players.map((player) => {
                const ratingRow = ratingHistoryMap.get(player.user_id);
                return (
                  <View key={player.user_id} style={styles.ratingRow}>
                    <Text style={styles.playerName}>
                      {formatProfileName(
                        profileMap.get(player.user_id) ?? {
                          id: player.user_id,
                          username: null,
                          full_name: null
                        }
                      )}
                    </Text>
                    <Text style={styles.ratingDetail}>
                      {formatSignedDelta(ratingRow?.delta ?? null)}
                    </Text>
                    <Text style={styles.ratingDetail}>
                      {formatLevel(ratingRow?.level_after ?? null)}
                    </Text>
                    <Text style={styles.ratingDetail}>
                      {formatReliability(ratingRow?.reliability_after ?? null)}
                    </Text>
                  </View>
                );
              })
            )}
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
  helperText: {
    color: "#666"
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
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  ratingDetail: {
    color: "#333",
    minWidth: 64,
    textAlign: "right"
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
  },
  winnerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd"
  },
  winnerButtonActive: {
    backgroundColor: "#111",
    borderColor: "#111"
  },
  winnerButtonText: {
    fontWeight: "600",
    color: "#333"
  },
  winnerButtonTextActive: {
    color: "#fff"
  }
});
