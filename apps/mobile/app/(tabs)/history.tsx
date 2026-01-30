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

const getOpponentName = (record: MatchRecord): string => {
  if (record.winner === record.players.playerAName) {
    return record.players.playerBName;
  }
  if (record.winner === record.players.playerBName) {
    return record.players.playerAName;
  }
  return record.players.playerBName;
};

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const refreshHistory = useCallback(() => {
    setHistory(loadHistory());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshHistory();
    }, [refreshHistory])
  );

  const handleClearHistory = () => {
    if (typeof window !== "undefined" && window.confirm) {
      if (!window.confirm("Clear recent match history?")) {
        return;
      }
    } else {
      Alert.alert("Clear match history", "Remove all stored matches?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearHistory();
            setHistory([]);
          }
        }
      ]);
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
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>Review past matches and rematches.</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsOpen(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

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
          history.map((record) => {
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
                  <Text style={styles.historyScore}>{record.finalScoreString}</Text>
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
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted,
      marginTop: 4,
      maxWidth: 240
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
