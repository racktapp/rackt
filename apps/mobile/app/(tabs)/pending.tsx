import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

type MatchHeader = {
  id: string;
  sport: string;
  format: string;
  score_text: string | null;
  played_at: string | null;
  reported_by: string | null;
  status: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "Unknown date";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "Unknown date"
    : parsed.toLocaleDateString();
};

export default function PendingConfirmationsScreen() {
  const [matches, setMatches] = useState<MatchHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPending = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setIsLoading(false);
      router.replace("/(auth)/sign-in");
      return;
    }

    const { data: confirmations, error: confirmationsError } = await supabase
      .from("match_confirmations")
      .select("match_id")
      .eq("user_id", data.user.id)
      .eq("status", "pending");

    if (confirmationsError) {
      Alert.alert("Pending confirmations", confirmationsError.message);
      setMatches([]);
      setIsLoading(false);
      return;
    }

    const matchIds = Array.from(
      new Set((confirmations ?? []).map((row) => row.match_id))
    );

    if (matchIds.length === 0) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    const { data: matchRows, error: matchesError } = await supabase
      .from("matches")
      .select("id, sport, format, score_text, played_at, reported_by, status")
      .in("id", matchIds)
      .order("played_at", { ascending: false });

    if (matchesError) {
      Alert.alert("Pending confirmations", matchesError.message);
      setMatches([]);
      setIsLoading(false);
      return;
    }

    setMatches(matchRows ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pending confirmations</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadPending}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Checking confirmations...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No matches waiting for you.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {matches.map((match) => (
            <TouchableOpacity
              key={match.id}
              style={styles.card}
              onPress={() => router.push(`/(tabs)/match/${match.id}`)}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{match.sport}</Text>
                <Text style={styles.cardMeta}>{match.format}</Text>
              </View>
              <Text style={styles.cardMeta}>{formatDate(match.played_at)}</Text>
              <Text style={styles.cardScore}>
                {match.score_text || "Score not provided"}
              </Text>
              <Text style={styles.cardStatus}>
                Status: {match.status ?? "pending"}
              </Text>
            </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: {
    fontSize: 26,
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
    paddingVertical: 32
  },
  emptyText: {
    color: "#666"
  },
  list: {
    gap: 12
  },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
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
  }
});
