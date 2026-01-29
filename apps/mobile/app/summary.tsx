import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";
import {
  clearMatch,
  loadMatch,
  StoredMatch
} from "../src/lib/storage/matchStorage";
import { buildMatchSummary } from "../src/lib/match/summary";

const formatDuration = (durationSeconds: number): string => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export default function SummaryScreen() {
  const router = useRouter();
  const [match, setMatch] = useState<StoredMatch | null>(null);

  useEffect(() => {
    const stored = loadMatch();
    if (!stored) {
      router.replace("/");
      return;
    }
    if (!stored.tennisState.matchWinner) {
      router.replace("/match");
      return;
    }
    setMatch(stored);
  }, [router]);

  const summary = useMemo(() => {
    if (!match) {
      return null;
    }
    return buildMatchSummary({
      config: match.config,
      finalState: match.tennisState,
      timeline: match.timeline
    });
  }, [match]);

  const loserName = useMemo(() => {
    if (!summary || !match) {
      return "";
    }
    return summary.winnerId === "A"
      ? match.config.playerBName
      : match.config.playerAName;
  }, [match, summary]);

  const summaryLine = useMemo(() => {
    if (!summary) {
      return "";
    }
    return `${summary.winnerName} def. ${loserName} ${summary.finalScoreString}`;
  }, [loserName, summary]);

  const handleCopySummary = async () => {
    if (!summary) {
      return;
    }
    const text = `${summaryLine} • ${formatDuration(summary.durationSeconds)}`;
    try {
      if (Platform.OS === "web" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        Alert.alert("Copied", "Match summary copied to clipboard.");
        return;
      }
      await Share.share({ message: text });
    } catch (error) {
      Alert.alert("Copy failed", "Unable to copy summary text.");
    }
  };

  const handleSaveCard = async () => {
    if (!summary) {
      return;
    }
    if (Platform.OS !== "web") {
      Alert.alert(
        "Export unavailable",
        "Result card export is available on web right now."
      );
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const width = 1000;
      const height = 600;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas unavailable");
      }
      context.fillStyle = "#151923";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#2a2f3a";
      context.lineWidth = 6;
      context.strokeRect(24, 24, width - 48, height - 48);
      context.fillStyle = "#ffffff";
      context.font = "700 54px Arial";
      context.fillText(match.config.playerAName, 80, 160);
      context.fillText(match.config.playerBName, 80, 260);
      context.fillStyle = "#7fb4ff";
      context.font = "700 40px Arial";
      context.fillText(summary.finalScoreString, 80, 360);
      context.fillStyle = "#9da5b4";
      context.font = "500 28px Arial";
      context.fillText(matchDate, 80, 420);
      context.font = "600 24px Arial";
      context.fillText("Rackt", width - 180, height - 80);
      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `rackt-${new Date(summary.endedAt)
        .toISOString()
        .slice(0, 10)}.png`;
      const isIOS =
        typeof navigator !== "undefined" &&
        /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(dataUrl, "_blank");
        return;
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } catch (error) {
      Alert.alert("Export failed", "Unable to export result card.");
    }
  };

  const handleNewMatch = () => {
    clearMatch();
    router.replace("/");
  };

  if (!match || !summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Loading summary...</Text>
      </View>
    );
  }

  const matchDate = formatDate(summary.endedAt);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Match Summary</Text>
          <Text style={styles.subTitle}>{matchDate}</Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroWinner}>{summary.winnerName}</Text>
          <Text style={styles.heroLine}>{summaryLine}</Text>
          <Text style={styles.heroMeta}>
            Duration {formatDuration(summary.durationSeconds)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Set-by-set</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableLabel]}>Set</Text>
            <Text style={[styles.tableCell, styles.tableLabel]}>
              {match.config.playerAName}
            </Text>
            <Text style={[styles.tableCell, styles.tableLabel]}>
              {match.config.playerBName}
            </Text>
          </View>
          {summary.setScores.map((set) => (
            <View key={`set-${set.setNumber}`} style={styles.tableRow}>
              <Text style={styles.tableCell}>#{set.setNumber}</Text>
              <Text style={styles.tableCell}>{set.gamesA}</Text>
              <Text style={styles.tableCell}>{set.gamesB}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Momentum</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Games won</Text>
            <Text style={styles.statValue}>
              {summary.counts.gamesA} • {summary.counts.gamesB}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Sets won</Text>
            <Text style={styles.statValue}>
              {summary.counts.setsA} • {summary.counts.setsB}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tiebreaks played</Text>
            <Text style={styles.statValue}>{summary.counts.tiebreaksPlayed}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Points won</Text>
            <Text style={styles.statValue}>
              {summary.counts.pointsA ?? 0} • {summary.counts.pointsB ?? 0}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Result Card</Text>
          <View style={styles.cardPreview}>
            <View style={styles.cardRow}>
              <Text style={styles.cardPlayer}>{match.config.playerAName}</Text>
              <Text style={styles.cardScore}>{summary.finalScoreString}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardPlayer}>{match.config.playerBName}</Text>
              <Text style={styles.cardMeta}>{matchDate}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>Rackt</Text>
            </View>
          </View>
          <Text style={styles.cardHint}>
            Save or share the result card as a premium match recap.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionPrimary]}
            onPress={handleSaveCard}
          >
            <Text style={styles.actionText}>Save result card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionSecondary]}
            onPress={handleCopySummary}
          >
            <Text style={styles.actionText}>Copy summary text</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionGhost]}
            onPress={() => router.replace("/match")}
          >
            <Text style={styles.actionGhostText}>Back to Scoreboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionSecondary]}
            onPress={handleNewMatch}
          >
            <Text style={styles.actionText}>New Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  heroCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#12151c",
    borderWidth: 1,
    borderColor: "#242a36",
    alignItems: "center",
    gap: 8
  },
  heroWinner: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700"
  },
  heroLine: {
    color: "#cfe1ff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center"
  },
  heroMeta: {
    color: "#9da5b4",
    fontSize: 13
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#11141b",
    borderWidth: 1,
    borderColor: "#242a36",
    gap: 12
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#242a36",
    paddingBottom: 8
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6
  },
  tableCell: {
    flex: 1,
    color: "#fff",
    fontSize: 14
  },
  tableLabel: {
    color: "#9da5b4",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 12
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  statLabel: {
    color: "#9da5b4",
    fontSize: 13
  },
  statValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600"
  },
  cardPreview: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#151923",
    borderWidth: 1,
    borderColor: "#2a2f3a",
    gap: 12
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardPlayer: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  cardScore: {
    color: "#7fb4ff",
    fontSize: 14,
    fontWeight: "700"
  },
  cardMeta: {
    color: "#9da5b4",
    fontSize: 12
  },
  cardFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2f3a",
    alignItems: "flex-end"
  },
  cardFooterText: {
    color: "#9da5b4",
    fontSize: 12,
    fontWeight: "600"
  },
  cardHint: {
    color: "#9da5b4",
    fontSize: 12
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
  actionGhost: {
    borderWidth: 1,
    borderColor: "#2a2f3a"
  },
  actionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700"
  },
  actionGhostText: {
    color: "#9da5b4",
    fontSize: 15,
    fontWeight: "600"
  }
});
