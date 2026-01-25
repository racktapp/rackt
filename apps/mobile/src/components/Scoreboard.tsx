import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useXboxController } from "../hooks/useXboxController";

type ScoreSnapshot = {
  scoreA: number;
  scoreB: number;
};

export default function Scoreboard() {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [history, setHistory] = useState<ScoreSnapshot[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, { scoreA, scoreB }]);
  }, [scoreA, scoreB]);

  const incrementA = useCallback(() => {
    pushHistory();
    setScoreA((prev) => prev + 1);
    setStatusMessage("Player A scored +1");
  }, [pushHistory]);

  const incrementB = useCallback(() => {
    pushHistory();
    setScoreB((prev) => prev + 1);
    setStatusMessage("Player B scored +1");
  }, [pushHistory]);

  const undoLastAction = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        setStatusMessage("Nothing to undo");
        return prev;
      }

      const nextHistory = [...prev];
      const last = nextHistory.pop();
      if (last) {
        setScoreA(last.scoreA);
        setScoreB(last.scoreB);
        setStatusMessage("Last action undone");
      }
      return nextHistory;
    });
  }, []);

  const captureHighlight = useCallback(() => {
    setStatusMessage("Highlight captured");
    console.log("Highlight captured");
    Alert.alert("Highlight captured", "Saved the highlight marker.");
  }, []);

  const { isConnected } = useXboxController({
    onShortA: incrementA,
    onLongA: undoLastAction,
    onShortB: incrementB,
    onLongB: captureHighlight,
    longPressMs: 500
  });

  const statusText = useMemo(() => {
    if (!statusMessage) {
      return "Use A/B on an Xbox controller to keep score.";
    }
    return statusMessage;
  }, [statusMessage]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Live Scoreboard</Text>
        {isConnected ? (
          <View style={styles.connectionBadge}>
            <View style={styles.connectionDot} />
            <Text style={styles.connectionText}>Controller connected</Text>
          </View>
        ) : (
          <Text style={styles.connectionHint}>Controller disconnected</Text>
        )}
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreColumn}>
          <Text style={styles.playerLabel}>Player A</Text>
          <Text style={styles.scoreValue}>{scoreA}</Text>
          <TouchableOpacity style={styles.scoreButton} onPress={incrementA}>
            <Text style={styles.scoreButtonText}>+1 (A)</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.scoreColumn}>
          <Text style={styles.playerLabel}>Player B</Text>
          <Text style={styles.scoreValue}>{scoreB}</Text>
          <TouchableOpacity style={styles.scoreButton} onPress={incrementB}>
            <Text style={styles.scoreButtonText}>+1 (B)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={undoLastAction}>
          <Text style={styles.secondaryButtonText}>Undo (hold A)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={captureHighlight}>
          <Text style={styles.secondaryButtonText}>Capture highlight (hold B)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    gap: 16
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    fontSize: 18,
    fontWeight: "700"
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e6f6ed",
    gap: 6
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1d7a46"
  },
  connectionText: {
    color: "#1d7a46",
    fontSize: 12,
    fontWeight: "600"
  },
  connectionHint: {
    fontSize: 12,
    color: "#777"
  },
  scoreRow: {
    flexDirection: "row",
    gap: 16
  },
  scoreColumn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    gap: 8
  },
  playerLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600"
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "700"
  },
  scoreButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111"
  },
  scoreButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  actionRow: {
    gap: 8
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd"
  },
  secondaryButtonText: {
    fontWeight: "600",
    textAlign: "center",
    color: "#333"
  },
  statusText: {
    fontSize: 12,
    color: "#666"
  }
});
