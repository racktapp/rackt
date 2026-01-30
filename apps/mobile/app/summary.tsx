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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MatchSummaryView from "../src/components/MatchSummaryView";
import { formatDate, formatDuration } from "../src/lib/history/historyFormat";
import { addToHistory } from "../src/lib/history/historyStorage";
import {
  clearMatch,
  loadMatch,
  StoredMatch
} from "../src/lib/storage/matchStorage";
import { buildMatchSummary } from "../src/lib/match/summary";

const LAST_SAVED_MATCH_ID_KEY = "rackt.history.lastSavedMatchId";

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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

  useEffect(() => {
    if (!summary || !match) {
      return;
    }
    const recordId = `${match.config.startTime}-${match.config.playerAName}-${match.config.playerBName}`;
    const storage = getStorage();
    if (storage?.getItem(LAST_SAVED_MATCH_ID_KEY) === recordId) {
      return;
    }
    addToHistory({
      id: recordId,
      createdAt: summary.endedAt,
      players: {
        playerAName: match.config.playerAName,
        playerBName: match.config.playerBName
      },
      bestOf: match.config.bestOf,
      tiebreakRule: match.config.tiebreakAt6All
        ? "TIEBREAK_AT_6_ALL"
        : "ADVANTAGE",
      tiebreakTo: match.config.tiebreakTo,
      superTiebreakOnly: match.config.superTiebreakOnly,
      shortSetTo: match.config.shortSetTo,
      finalScoreString: summary.finalScoreString,
      winner: summary.winnerName,
      durationSeconds: summary.durationSeconds,
      sets: summary.setScores
    });
    storage?.setItem(LAST_SAVED_MATCH_ID_KEY, recordId);
  }, [match, summary]);

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
    if (!summary || !match) {
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.label}>Loading summary...</Text>
      </SafeAreaView>
    );
  }

  const matchDate = formatDate(summary.endedAt);
  const durationLabel = formatDuration(summary.durationSeconds);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Match Summary</Text>
          <Text style={styles.subTitle}>{matchDate}</Text>
        </View>

        <MatchSummaryView
          config={match.config}
          summary={summary}
          summaryLine={summaryLine}
          matchDate={matchDate}
          durationLabel={durationLabel}
        />

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
