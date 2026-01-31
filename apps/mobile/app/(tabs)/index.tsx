import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import SettingsDrawer from "../../src/components/SettingsDrawer";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";
import { formatDate, formatDuration } from "../../src/lib/history/historyFormat";
import {
  clearHistory,
  loadHistory,
  MatchRecord
} from "../../src/lib/history/historyStorage";
import { DEFAULT_PRESETS } from "../../src/lib/presets/defaultPresets";
import { loadCustomPresets } from "../../src/lib/presets/presetStorage";
import { MatchPreset } from "../../src/lib/presets/types";
import { loadMatch, StoredMatch } from "../../src/lib/storage/matchStorage";

const getOpponentName = (record: MatchRecord): string => {
  if (record.winner === record.players.playerAName) {
    return record.players.playerBName;
  }
  if (record.winner === record.players.playerBName) {
    return record.players.playerAName;
  }
  return record.players.playerBName;
};

const formatTeamName = (
  team: StoredMatch["config"]["teamA"]
): string => team.players.map((player) => player.name).join(" / ");

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [activeMatch, setActiveMatch] = useState<StoredMatch | null>(null);
  const [presets, setPresets] = useState<MatchPreset[]>(DEFAULT_PRESETS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const refreshData = useCallback(() => {
    setHistory(loadHistory());
    setActiveMatch(loadMatch());
    setPresets([...DEFAULT_PRESETS, ...loadCustomPresets()]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  const hasActiveMatch = Boolean(
    activeMatch && !activeMatch.matchState.score.matchWinner
  );

  const handleClearHistory = () => {
    if (typeof window !== "undefined" && window.confirm) {
      if (!window.confirm("Clear recent match history?")) {
        return;
      }
    } else {
      Alert.alert(
        "Clear match history",
        "Remove all stored recent matches?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: () => {
              clearHistory();
              setHistory([]);
            }
          }
        ]
      );
      return;
    }
    clearHistory();
    setHistory([]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.appTitle}>Rackt</Text>
            <Text style={styles.tagline}>
              Match tracking that feels tournament-ready.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsOpen(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={() => router.push("/(tabs)/new")}
        >
          <Text style={styles.cardEyebrow}>Quick start</Text>
          <Text style={styles.cardTitle}>Start a new match</Text>
          <Text style={styles.cardBody}>
            Set players, format, and jump straight to the scoreboard.
          </Text>
          <View style={styles.cardCta}>
            <Text style={styles.cardCtaText}>New Match</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Presets</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetCard}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/new",
                  params: { presetId: preset.id }
                })
              }
            >
              <Text style={styles.presetTitle}>{preset.title}</Text>
              <Text style={styles.presetSubtitle}>{preset.subtitle}</Text>
              <View style={styles.presetCta}>
                <Text style={styles.presetCtaText}>Start preset</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {hasActiveMatch && activeMatch && (
          <TouchableOpacity
            style={[styles.card, styles.secondaryCard]}
            onPress={() => router.push("/match")}
          >
            <Text style={styles.cardEyebrow}>Continue last match</Text>
            <Text style={styles.cardTitle}>
              {formatTeamName(activeMatch.config.teamA)} vs{" "}
              {formatTeamName(activeMatch.config.teamB)}
            </Text>
            <Text style={styles.cardBody}>
              Jump back into the live scoreboard and keep the momentum going.
            </Text>
            <View style={styles.cardCtaSecondary}>
              <Text style={styles.cardCtaTextSecondary}>Continue Match</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.clearButton}>Clear history</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyBody}>
              Finish a match to see the recap appear here instantly.
            </Text>
          </View>
        ) : (
          history.slice(0, 10).map((record) => {
            const opponent = getOpponentName(record);
            const duration =
              record.durationSeconds > 0
                ? `• ${formatDuration(record.durationSeconds)}`
                : "";
            return (
              <TouchableOpacity
                key={record.id}
                style={styles.historyCard}
                onPress={() => router.push(`/history/${record.id}`)}
              >
                <View style={styles.historyRow}>
                  <Text style={styles.historyWinner}>{record.winner}</Text>
                  <Text style={styles.historyScore}>
                    {record.finalScoreString}
                  </Text>
                </View>
                <Text style={styles.historyLine}>
                  {record.winner} def. {opponent}
                </Text>
                <Text style={styles.historyMeta}>
                  {formatDate(record.createdAt)} {duration}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <SettingsDrawer
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
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
    appTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.text
    },
    tagline: {
      color: colors.muted,
      marginTop: 4,
      maxWidth: 220
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    settingsIcon: {
      fontSize: 16
    },
    card: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1
    },
    primaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border
    },
    secondaryCard: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border
    },
    cardEyebrow: {
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 1.4,
      fontSize: 12
    },
    cardTitle: {
      marginTop: 8,
      color: colors.text,
      fontSize: 20,
      fontWeight: "700"
    },
    cardBody: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    },
    cardCta: {
      marginTop: 16,
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999
    },
    cardCtaText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 14
    },
    cardCtaSecondary: {
      marginTop: 16,
      alignSelf: "flex-start",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 8
    },
    cardCtaTextSecondary: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14
    },
    presetRow: {
      gap: 12,
      paddingVertical: 4,
      paddingRight: 8
    },
    presetCard: {
      width: 220,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10
    },
    presetTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700"
    },
    presetSubtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18
    },
    presetCta: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border
    },
    presetCtaText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 12
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text
    },
    clearButton: {
      color: colors.muted,
      fontSize: 13
    },
    emptyState: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600"
    },
    emptyBody: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 13
    },
    historyCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6
    },
    historyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    historyWinner: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700"
    },
    historyScore: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "700"
    },
    historyLine: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600"
    },
    historyMeta: {
      color: colors.muted,
      fontSize: 12
    }
  });
