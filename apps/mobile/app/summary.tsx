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
import { useSettings } from "../src/components/SettingsProvider";
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
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const stored = loadMatch();
    if (!stored) {
      router.replace("/(tabs)");
      return;
    }
    if (!stored.matchState.score.matchWinner) {
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
      finalState: match.matchState,
      timeline: match.timeline
    });
  }, [match]);

  useEffect(() => {
    if (!summary || !match) {
      return;
    }
    const recordId = `${match.config.startTime}-${match.config.teamA.players
      .map((player) => player.name)
      .join("-")}-${match.config.teamB.players
      .map((player) => player.name)
      .join("-")}`;
    const storage = getStorage();
    if (storage?.getItem(LAST_SAVED_MATCH_ID_KEY) === recordId) {
      return;
    }
    addToHistory({
      id: recordId,
      createdAt: summary.endedAt,
      players: {
        playerAName: match.config.teamA.players.map((player) => player.name).join(" / "),
        playerBName: match.config.teamB.players.map((player) => player.name).join(" / ")
      },
      bestOf: match.config.bestOf ?? 3,
      tiebreakRule: (match.config.tiebreakAt ?? 6) === 6
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
    const teamAName = match.config.teamA.players
      .map((player) => player.name)
      .join(" / ");
    const teamBName = match.config.teamB.players
      .map((player) => player.name)
      .join(" / ");
    return summary.winnerId === "A" ? teamBName : teamAName;
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
      context.fillStyle = colors.card;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = colors.border;
      context.lineWidth = 6;
      context.strokeRect(24, 24, width - 48, height - 48);
      context.fillStyle = colors.text;
      context.font = "700 54px Arial";
      context.fillText(
        match.config.teamA.players.map((player) => player.name).join(" / "),
        80,
        160
      );
      context.fillText(
        match.config.teamB.players.map((player) => player.name).join(" / "),
        80,
        260
      );
      context.fillStyle = colors.primary;
      context.font = "700 40px Arial";
      context.fillText(summary.finalScoreString, 80, 360);
      context.fillStyle = colors.muted;
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
    router.replace("/(tabs)/new");
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
            <Text style={[styles.actionText, styles.actionTextPrimary]}>
              Save result card
            </Text>
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

const createStyles = (colors: ReturnType<typeof useSettings>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
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
      color: colors.text
    },
    subTitle: {
      color: colors.muted
    },
    label: {
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 1.4,
      color: colors.muted
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
      backgroundColor: colors.primary
    },
    actionSecondary: {
      backgroundColor: colors.cardAlt,
      borderWidth: 1,
      borderColor: colors.border
    },
    actionGhost: {
      borderWidth: 1,
      borderColor: colors.border
    },
    actionText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700"
    },
    actionTextPrimary: {
      color: "#0B1220"
    },
    actionGhostText: {
      color: colors.muted,
      fontSize: 15,
      fontWeight: "600"
    }
  });
