import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MatchSummaryView from "../../src/components/MatchSummaryView";
import { formatDate, formatDuration } from "../../src/lib/history/historyFormat";
import {
  getHistoryById,
  MatchRecord
} from "../../src/lib/history/historyStorage";
import { MatchSummary } from "../../src/lib/match/summary";
import { MatchConfig } from "../../src/lib/storage/matchStorage";

const buildSummaryFromRecord = (record: MatchRecord): MatchSummary => {
  const gamesA = record.sets.reduce((acc, set) => acc + set.gamesA, 0);
  const gamesB = record.sets.reduce((acc, set) => acc + set.gamesB, 0);
  const setsA = record.sets.filter((set) => set.gamesA > set.gamesB).length;
  const setsB = record.sets.filter((set) => set.gamesB > set.gamesA).length;
  const tiebreakGamesTo = (record.shortSetTo ?? 6) + 1;
  const tiebreaksPlayed = record.superTiebreakOnly
    ? 1
    : record.tiebreakRule === "TIEBREAK_AT_6_ALL"
      ? record.sets.filter(
          (set) =>
            (set.gamesA === tiebreakGamesTo &&
              set.gamesB === tiebreakGamesTo - 1) ||
            (set.gamesA === tiebreakGamesTo - 1 &&
              set.gamesB === tiebreakGamesTo)
        ).length
      : 0;

  const winnerId =
    record.winner === record.players.playerAName
      ? "A"
      : record.winner === record.players.playerBName
        ? "B"
        : null;

  return {
    winnerId,
    winnerName: record.winner,
    setScores: record.sets,
    finalScoreString: record.finalScoreString,
    durationSeconds: record.durationSeconds,
    endedAt: record.createdAt,
    counts: {
      gamesA,
      gamesB,
      setsA,
      setsB,
      tiebreaksPlayed
    }
  };
};

export default function HistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const [record, setRecord] = useState<MatchRecord | null>(null);

  useEffect(() => {
    const id = typeof params.id === "string" ? params.id : params.id?.[0];
    if (!id) {
      router.replace("/(tabs)");
      return;
    }
    const found = getHistoryById(id);
    if (!found) {
      router.replace("/(tabs)");
      return;
    }
    setRecord(found);
  }, [params.id, router]);

  const summary = useMemo(
    () => (record ? buildSummaryFromRecord(record) : null),
    [record]
  );

  const config = useMemo<MatchConfig | null>(() => {
    if (!record) {
      return null;
    }
    const teamA = {
      id: "A" as const,
      players: [
        { userId: "A-1", name: record.players.playerAName }
      ]
    };
    const teamB = {
      id: "B" as const,
      players: [
        { userId: "B-1", name: record.players.playerBName }
      ]
    };
    return {
      sport: "tennis",
      format: "singles",
      teamA,
      teamB,
      bestOf: record.bestOf,
      tiebreakAt6All: record.tiebreakRule === "TIEBREAK_AT_6_ALL",
      tiebreakAt:
        record.tiebreakRule === "TIEBREAK_AT_6_ALL" ? 6 : undefined,
      tiebreakTo: record.tiebreakTo ?? 7,
      superTiebreakOnly: record.superTiebreakOnly ?? false,
      shortSetTo: record.shortSetTo,
      startTime: record.createdAt
    };
  }, [record]);

  if (!record || !summary || !config) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.label}>Loading match details...</Text>
      </SafeAreaView>
    );
  }

  const matchDate = formatDate(record.createdAt);
  const summaryLine = `${record.winner} def. ${
    record.winner === record.players.playerAName
      ? record.players.playerBName
      : record.players.playerAName
  } ${record.finalScoreString}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Match Details</Text>
          <Text style={styles.subTitle}>{matchDate}</Text>
        </View>

        <MatchSummaryView
          config={config}
          summary={summary}
          summaryLine={summaryLine}
          matchDate={matchDate}
          durationLabel={formatDuration(record.durationSeconds)}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionPrimary]}
            onPress={() => router.push(`/(tabs)/new?rematchId=${record.id}`)}
          >
            <Text style={styles.actionText}>Start rematch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionSecondary]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.actionText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0f"
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
    gap: 18
  },
  header: {
    alignItems: "center",
    gap: 6
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff"
  },
  subTitle: {
    color: "#9da5b4"
  },
  label: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: "#9da5b4"
  },
  actions: {
    gap: 12
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center"
  },
  actionPrimary: {
    backgroundColor: "#2f80ed"
  },
  actionSecondary: {
    backgroundColor: "#1c1f26"
  },
  actionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700"
  }
});
