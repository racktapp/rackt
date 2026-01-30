import { StyleSheet, Text, View } from "react-native";

import { MatchSummary } from "../lib/match/summary";
import { MatchConfig } from "../lib/storage/matchStorage";

type MatchSummaryViewProps = {
  config: MatchConfig;
  summary: MatchSummary;
  summaryLine: string;
  matchDate: string;
  durationLabel: string;
};

export default function MatchSummaryView({
  config,
  summary,
  summaryLine,
  matchDate,
  durationLabel
}: MatchSummaryViewProps) {
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
            {config.playerAName}
          </Text>
          <Text style={[styles.tableCell, styles.tableLabel]}>
            {config.playerBName}
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
            <Text style={styles.cardPlayer}>{config.playerAName}</Text>
            <Text style={styles.cardScore}>{summary.finalScoreString}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardPlayer}>{config.playerBName}</Text>
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

const styles = StyleSheet.create({
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
  }
});
