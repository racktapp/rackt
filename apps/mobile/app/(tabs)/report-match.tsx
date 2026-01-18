import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";

type SportKey = "tennis" | "padel" | "badminton" | "table_tennis";
type MatchFormat = "singles" | "doubles";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

const SPORTS: { key: SportKey; label: string }[] = [
  { key: "tennis", label: "Tennis" },
  { key: "padel", label: "Padel" },
  { key: "badminton", label: "Badminton" },
  { key: "table_tennis", label: "Table tennis" }
];

const formatProfileName = (profile: Profile) =>
  profile.full_name?.trim() || profile.username?.trim() || "Unknown player";

export default function ReportMatchScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sport, setSport] = useState<SportKey | null>(null);
  const [format, setFormat] = useState<MatchFormat | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [opponentIds, setOpponentIds] = useState<string[]>([]);
  const [scoreText, setScoreText] = useState("");
  const [isRanked, setIsRanked] = useState(true);
  const [winnerSide, setWinnerSide] = useState<1 | 2>(1);

  useEffect(() => {
    let isMounted = true;

    const loadUserAndFriends = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        router.replace("/(auth)/sign-in");
        return;
      }

      setUser(data.user);

      const { data: friendRows, error: friendsError } = await supabase
        .from("friends")
        .select("user_a, user_b")
        .or(`user_a.eq.${data.user.id},user_b.eq.${data.user.id}`);

      if (friendsError) {
        Alert.alert("Friends error", friendsError.message);
        setFriends([]);
        setIsLoading(false);
        return;
      }

      const otherUserIds = Array.from(
        new Set(
          (friendRows ?? []).map((row) =>
            row.user_a === data.user.id ? row.user_b : row.user_a
          )
        )
      );

      if (otherUserIds.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", otherUserIds)
        .order("username", { ascending: true });

      if (profilesError) {
        Alert.alert("Friends error", profilesError.message);
        setFriends([]);
        setIsLoading(false);
        return;
      }

      setFriends(profiles ?? []);
      setIsLoading(false);
    };

    loadUserAndFriends();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setOpponentId(null);
    setPartnerId(null);
    setOpponentIds([]);
  }, [format]);

  const friendOptions = useMemo(
    () =>
      friends.map((friend) => ({
        id: friend.id,
        label: formatProfileName(friend)
      })),
    [friends]
  );

  const toggleOpponent = (friendId: string) => {
    if (opponentIds.includes(friendId)) {
      setOpponentIds((current) => current.filter((id) => id !== friendId));
      return;
    }

    if (opponentIds.length >= 2) {
      Alert.alert("Opponents limit", "Select two opponents for doubles.");
      return;
    }

    setOpponentIds((current) => [...current, friendId]);
  };

  const validateSelection = () => {
    if (!sport) {
      Alert.alert("Missing sport", "Choose a sport to continue.");
      return false;
    }

    if (!format) {
      Alert.alert("Missing format", "Choose singles or doubles to continue.");
      return false;
    }

    if (format === "singles") {
      if (!opponentId) {
        Alert.alert("Missing opponent", "Select an opponent for singles.");
        return false;
      }
      return true;
    }

    if (!partnerId) {
      Alert.alert("Missing partner", "Select a partner for doubles.");
      return false;
    }

    if (opponentIds.length !== 2) {
      Alert.alert(
        "Missing opponents",
        "Select two opponents for doubles."
      );
      return false;
    }

    if (opponentIds.includes(partnerId)) {
      Alert.alert("Invalid teams", "Partner cannot be an opponent.");
      return false;
    }

    const uniqueIds = new Set([partnerId, ...opponentIds]);
    if (uniqueIds.size !== 3) {
      Alert.alert("Invalid teams", "All selected players must be unique.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (!validateSelection()) {
      return;
    }

    setIsSubmitting(true);

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert({
        sport,
        format,
        is_ranked: isRanked,
        status: "pending",
        reported_by: user.id,
        played_at: new Date().toISOString(),
        score_text: scoreText.trim(),
        winner_side: winnerSide
      })
      .select("id")
      .single();

    if (matchError || !matchData) {
      Alert.alert("Create match failed", matchError?.message ?? "Try again.");
      setIsSubmitting(false);
      return;
    }

    const matchId = matchData.id as string;

    const teamOneIds = [user.id];
    const teamTwoIds: string[] = [];

    if (format === "singles") {
      if (opponentId) {
        teamTwoIds.push(opponentId);
      }
    } else {
      if (partnerId) {
        teamOneIds.push(partnerId);
      }
      teamTwoIds.push(...opponentIds);
    }

    const matchPlayersPayload = [
      ...teamOneIds.map((playerId) => ({
        match_id: matchId,
        user_id: playerId,
        side: 1
      })),
      ...teamTwoIds.map((playerId) => ({
        match_id: matchId,
        user_id: playerId,
        side: 2
      }))
    ];

    const { error: playersError } = await supabase
      .from("match_players")
      .insert(matchPlayersPayload);

    if (playersError) {
      Alert.alert("Match players failed", playersError.message);
      setIsSubmitting(false);
      return;
    }

    const confirmationPayload = [
      { match_id: matchId, user_id: user.id, status: "confirmed" },
      ...teamOneIds
        .filter((playerId) => playerId !== user.id)
        .map((playerId) => ({
          match_id: matchId,
          user_id: playerId,
          status: "pending"
        })),
      ...teamTwoIds.map((playerId) => ({
        match_id: matchId,
        user_id: playerId,
        status: "pending"
      }))
    ];

    const { error: confirmationsError } = await supabase
      .from("match_confirmations")
      .insert(confirmationPayload);

    if (confirmationsError) {
      Alert.alert("Confirmations failed", confirmationsError.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.push(`/(tabs)/match/${matchId}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Report a match</Text>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sport</Text>
            <View style={styles.rowWrap}>
              {SPORTS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.choiceButton,
                    sport === option.key && styles.choiceButtonActive
                  ]}
                  onPress={() => setSport(option.key)}
                >
                  <Text
                    style={[
                      styles.choiceButtonText,
                      sport === option.key && styles.choiceButtonTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Format</Text>
            <View style={styles.rowWrap}>
              {["singles", "doubles"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.choiceButton,
                    format === option && styles.choiceButtonActive
                  ]}
                  onPress={() => setFormat(option as MatchFormat)}
                >
                  <Text
                    style={[
                      styles.choiceButtonText,
                      format === option && styles.choiceButtonTextActive
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Players</Text>
            {friendOptions.length === 0 ? (
              <Text style={styles.helperText}>Add friends to report a match.</Text>
            ) : !format ? (
              <Text style={styles.helperText}>
                Choose a format to pick players.
              </Text>
            ) : format === "singles" ? (
              <View style={styles.list}>
                {friendOptions.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.listRow}
                    onPress={() => setOpponentId(friend.id)}
                  >
                    <Text style={styles.listLabel}>{friend.label}</Text>
                    <Text style={styles.listValue}>
                      {opponentId === friend.id ? "Selected" : "Select"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.list}>
                <Text style={styles.subSectionTitle}>Partner (Team 1)</Text>
                {friendOptions.map((friend) => (
                  <TouchableOpacity
                    key={`partner-${friend.id}`}
                    style={styles.listRow}
                    onPress={() => setPartnerId(friend.id)}
                  >
                    <Text style={styles.listLabel}>{friend.label}</Text>
                    <Text style={styles.listValue}>
                      {partnerId === friend.id ? "Selected" : "Select"}
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.subSectionTitle}>Opponents (Team 2)</Text>
                {friendOptions.map((friend) => (
                  <TouchableOpacity
                    key={`opponent-${friend.id}`}
                    style={styles.listRow}
                    onPress={() => toggleOpponent(friend.id)}
                  >
                    <Text style={styles.listLabel}>{friend.label}</Text>
                    <Text style={styles.listValue}>
                      {opponentIds.includes(friend.id) ? "Selected" : "Select"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Score</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 6-3, 4-6, 10-8"
              value={scoreText}
              onChangeText={setScoreText}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Winner</Text>
            <View style={styles.rowWrap}>
              {[1, 2].map((side) => (
                <TouchableOpacity
                  key={`winner-${side}`}
                  style={[
                    styles.choiceButton,
                    winnerSide === side && styles.choiceButtonActive
                  ]}
                  onPress={() => setWinnerSide(side as 1 | 2)}
                >
                  <Text
                    style={[
                      styles.choiceButtonText,
                      winnerSide === side && styles.choiceButtonTextActive
                    ]}
                  >
                    Team {side}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.sectionTitle}>Ranked</Text>
              <Text style={styles.helperText}>Include this match in ratings.</Text>
            </View>
            <Switch value={isRanked} onValueChange={setIsRanked} />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isSubmitting && styles.primaryButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Creating match..." : "Create match"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  section: {
    gap: 12
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600"
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12
  },
  helperText: {
    color: "#666"
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  choiceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  choiceButtonActive: {
    backgroundColor: "#111",
    borderColor: "#111"
  },
  choiceButtonText: {
    color: "#333",
    fontWeight: "600"
  },
  choiceButtonTextActive: {
    color: "#fff"
  },
  list: {
    gap: 8
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f5"
  },
  listLabel: {
    fontWeight: "600"
  },
  listValue: {
    color: "#666"
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center"
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
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
  }
});
