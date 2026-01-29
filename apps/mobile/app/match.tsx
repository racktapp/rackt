import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { pointWonBy, reset } from "../src/lib/tennis/engine";
import { Player, TennisState } from "../src/lib/tennis/types";
import {
  clearMatch,
  loadMatch,
  MatchConfig,
  saveMatch
} from "../src/lib/storage/matchStorage";

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

const serverLabel = (server: Player, config: MatchConfig): string =>
  server === "A" ? config.playerAName : config.playerBName;

export default function MatchScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [state, setState] = useState<TennisState | null>(null);
  const [history, setHistory] = useState<TennisState[]>([]);

  useEffect(() => {
    const stored = loadMatch();
    if (!stored) {
      router.replace("/");
      return;
    }
    setConfig(stored.config);
    setState(stored.tennisState);
    setHistory(stored.history);
  }, [router]);

  useEffect(() => {
    if (!config || !state) {
      return;
    }
    saveMatch({ config, tennisState: state, history });
  }, [config, history, state]);

  const setScore = useMemo(() => {
    if (!state || !config) {
      return "";
    }
    const current = state.sets[state.currentSet];
    return `${config.playerAName} ${current.gamesA} - ${current.gamesB} ${config.playerBName}`;
  }, [config, state]);

  if (!config || !state) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Loading match...</Text>
      </View>
    );
  }

  const handlePoint = (player: Player) => {
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
    clearMatch();
    router.replace("/");
  };

  const handleResetScores = () => {
    setState(
      reset({
        bestOf: config.bestOf,
        tiebreakAt6All: config.tiebreakAt6All,
        startingServer: config.startingServer
      })
    );
    setHistory([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scoreboard</Text>
      <Text style={styles.subTitle}>
        Best of {config.bestOf} • Tie-break {config.tiebreakAt6All ? "On" : "Off"}
      </Text>
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
        <Text style={styles.value}>{serverLabel(state.server, config)}</Text>
      </View>
      {state.matchWinner ? (
        <View style={styles.scoreBlock}>
          <Text style={styles.label}>Winner</Text>
          <Text style={styles.value}>
            {state.matchWinner === "A"
              ? config.playerAName
              : config.playerBName}
          </Text>
        </View>
      ) : null}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handlePoint("A")}
        >
          <Text style={styles.buttonText}>Point {config.playerAName}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handlePoint("B")}
        >
          <Text style={styles.buttonText}>Point {config.playerBName}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleUndo}>
          <Text style={styles.secondaryButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleResetScores}>
          <Text style={styles.secondaryButtonText}>Reset Score</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.resetMatchButton} onPress={handleReset}>
        <Text style={styles.resetMatchText}>Reset Match</Text>
      </TouchableOpacity>
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
    marginBottom: 8
  },
  subTitle: {
    textAlign: "center",
    color: "#9da5b4",
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
    fontSize: 22,
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
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center"
  },
  secondaryButtonText: {
    color: "#d0d4dc",
    fontSize: 16,
    fontWeight: "500"
  },
  resetMatchButton: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3b3f4a",
    alignItems: "center"
  },
  resetMatchText: {
    color: "#ff8b8b",
    fontSize: 16,
    fontWeight: "600"
  }
});
