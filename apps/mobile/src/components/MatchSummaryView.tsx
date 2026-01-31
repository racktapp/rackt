import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MatchSummary } from "../lib/match/summary";
import { MatchConfig } from "../lib/storage/matchStorage";
import { ThemeColors, useSettings } from "./SettingsProvider";

type MatchSummaryViewProps = {
  config: MatchConfig;
  summary: MatchSummary;
  summaryLine: string;
  matchDate: string;
  durationLabel: string;
};

const formatTeamName = (config: MatchConfig, teamId: "A" | "B") => {
  const team = teamId === "A" ? config.teamA : config.teamB;
  return team.players.map((player) => player.name).join(" / ");
};

export default function MatchSummaryView({
  config,
  summary,
  summaryLine,
  matchDate,
  durationLabel
}: MatchSummaryViewProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroWinner}>{summary.winnerName}</Text>
        <Text style={styles.heroLine}>{summaryLine}</Text>
        <Text style={styles.heroMeta}>Duration {durationLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Set-by-set</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.tableLabel]}>Set</Text>
          <Text style={[styles.tableCell, styles.tableLabel]}>
            {formatTeamName(config, "A")}
          </Text>
          <Text style={[styles.tableCell, styles.tableLabel]}>
            {formatTeamName(config, "B")}
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
            <Text style={styles.cardPlayer}>{formatTeamName(config, "A")}</Text>
            <Text style={styles.cardScore}>{summary.finalScoreString}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardPlayer}>{formatTeamName(config, "B")}</Text>
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
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    heroCard: {
      padding: 18,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      gap: 8
    },
    heroWinner: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700"
    },
    heroLine: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center"
    },
    heroMeta: {
      color: colors.muted,
      fontSize: 13
    },
    card: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.cardAlt,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600"
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 6
    },
    tableCell: {
      flex: 1,
      color: colors.text,
      fontSize: 14
    },
    tableLabel: {
      color: colors.muted,
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
      color: colors.muted,
      fontSize: 13
    },
    statValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600"
    },
    cardPreview: {
      borderRadius: 18,
      padding: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12
    },
    cardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    cardPlayer: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700"
    },
    cardScore: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700"
    },
    cardMeta: {
      color: colors.muted,
      fontSize: 12
    },
    cardFooter: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: "flex-end"
    },
    cardFooterText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600"
    },
    cardHint: {
      color: colors.muted,
      fontSize: 12
    }
  });
