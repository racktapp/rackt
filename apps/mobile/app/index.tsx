import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { initialState, pointWonBy, reset } from "../src/lib/tennis/engine";
import { TennisState } from "../src/lib/tennis/types";

const pointLabel = (points: number): string => {
  switch (points) {
    case 0:
      return "0";
    case 1:
      return "15";
    case 2:
      return "30";
    case 3:
      return "40";
    default:
      return "40";
  }
};

const gameScoreLabel = (state: TennisState): string => {
  const { gamePointsA, gamePointsB } = state;
  if (gamePointsA >= 3 && gamePointsB >= 3) {
    if (gamePointsA === gamePointsB) {
      return "Deuce";
    }
    const leader = gamePointsA > gamePointsB ? "A" : "B";
    return `Advantage ${leader}`;
  }
  return `${pointLabel(gamePointsA)} - ${pointLabel(gamePointsB)}`;
};

export default function Home() {
  const [state, setState] = useState<TennisState>(() => initialState());
  const [history, setHistory] = useState<TennisState[]>([]);

  const setScore = useMemo(() => {
    const current = state.sets[state.currentSet];
    return `${current.gamesA} - ${current.gamesB}`;
  }, [state]);

  const handlePoint = (player: "A" | "B") => {
    setHistory((prev) => [...prev, state]);
    setState(pointWonBy(state, player));
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const nextHistory = [...prev];
      const previous = nextHistory.pop();
      if (previous) {
        setState(previous);
      }
      return nextHistory;
    });
  };

  const handleReset = () => {
    setState(reset());
    setHistory([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tennis Scoring Demo</Text>
      <View style={styles.scoreBlock}>
        <Text style={styles.label}>Set Score</Text>
        <Text style={styles.value}>{setScore}</Text>
      </View>
      <View style={styles.scoreBlock}>
        <Text style={styles.label}>Game Score</Text>
        <Text style={styles.value}>{gameScoreLabel(state)}</Text>
      </View>
      {state.isTiebreak ? (
        <View style={styles.scoreBlock}>
          <Text style={styles.label}>Tie-break</Text>
          <Text style={styles.value}>
            {state.tiebreakPointsA} - {state.tiebreakPointsB}
          </Text>
        </View>
      ) : null}
      <View style={styles.scoreBlock}>
        <Text style={styles.label}>Server</Text>
        <Text style={styles.value}>{state.server}</Text>
      </View>
      {state.matchWinner ? (
        <View style={styles.scoreBlock}>
          <Text style={styles.label}>Winner</Text>
          <Text style={styles.value}>Player {state.matchWinner}</Text>
        </View>
      ) : null}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handlePoint("A")}
        >
          <Text style={styles.buttonText}>Point A</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handlePoint("B")}
        >
          <Text style={styles.buttonText}>Point B</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleUndo}>
          <Text style={styles.secondaryButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#0b0b0f"
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 24
  },
  scoreBlock: {
    marginBottom: 16,
    alignItems: "center"
  },
  label: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: "#9da5b4",
    marginBottom: 6
  },
  value: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff"
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#1c1f26",
    alignItems: "center"
  },
  primaryButton: {
    backgroundColor: "#2f80ed"
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },
  secondaryButtonText: {
    color: "#d0d4dc",
    fontSize: 16,
    fontWeight: "500"
  }
});
