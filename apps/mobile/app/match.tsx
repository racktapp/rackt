import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { reset } from "../src/lib/tennis/engine";
import { Player, TennisState } from "../src/lib/tennis/types";
import {
  clearMatch,
  loadMatch,
  MatchConfig,
  saveMatch
} from "../src/lib/storage/matchStorage";
import { applyAction, InputAction } from "../src/lib/input/actions";
import { useKeyboardControls } from "../src/lib/input/keyboard";

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
  const [inputEnabled, setInputEnabled] = useState(true);
  const [controllerExpanded, setControllerExpanded] = useState(false);

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

  const resetScores = useCallback(() => {
    if (!config) {
      return;
    }
    setState(
      reset({
        bestOf: config.bestOf,
        tiebreakAt6All: config.tiebreakAt6All,
        startingServer: config.startingServer
      })
    );
    setHistory([]);
  }, [config]);

  const confirmResetScores = useCallback(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Reset the current match scores?")) {
        resetScores();
      }
      return;
    }

    Alert.alert(
      "Reset match scores",
      "This will reset the current match scores.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetScores }
      ]
    );
  }, [resetScores]);

  const handleReset = () => {
    clearMatch();
    router.replace("/");
  };

  const handleUndo = useCallback(() => {
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
  }, []);

  const handleAction = useCallback(
    (action: InputAction) => {
      switch (action.type) {
        case "POINT_A":
        case "POINT_B": {
          setState((prev) => {
            if (!prev) {
              return prev;
            }
            setHistory((historyPrev) => [...historyPrev, prev]);
            return applyAction(prev, action);
          });
          break;
        }
        case "UNDO":
          handleUndo();
          break;
        case "RESET":
          confirmResetScores();
          break;
        case "TOGGLE_INPUT":
          setInputEnabled((prev) => !prev);
          break;
        default:
          break;
      }
    },
    [confirmResetScores, handleUndo]
  );

  useKeyboardControls({ enabled: inputEnabled, onAction: handleAction });

  const controllerMappings = [
    { label: "Point Player A", key: "A" },
    { label: "Point Player B", key: "L" },
    { label: "Undo", key: "U" },
    { label: "Reset match", key: "R" },
    { label: "Toggle input", key: "I" }
  ];

  if (!config || !state) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Loading match...</Text>
      </View>
    );
  }

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
          onPress={() => handleAction({ type: "POINT_A" })}
        >
          <Text style={styles.buttonText}>Point {config.playerAName}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handleAction({ type: "POINT_B" })}
        >
          <Text style={styles.buttonText}>Point {config.playerBName}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleAction({ type: "UNDO" })}
        >
          <Text style={styles.secondaryButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={confirmResetScores}>
          <Text style={styles.secondaryButtonText}>Reset Score</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.resetMatchButton} onPress={handleReset}>
        <Text style={styles.resetMatchText}>Reset Match</Text>
      </TouchableOpacity>
      <View style={styles.controllerPanel}>
        <TouchableOpacity
          style={styles.controllerHeader}
          onPress={() => setControllerExpanded((prev) => !prev)}
        >
          <Text style={styles.controllerTitle}>Controller</Text>
          <Text style={styles.controllerToggleText}>
            {controllerExpanded ? "Hide" : "Show"}
          </Text>
        </TouchableOpacity>
        {controllerExpanded ? (
          <View style={styles.controllerBody}>
            <View style={styles.controllerRow}>
              <Text style={styles.controllerLabel}>Input</Text>
              <View style={styles.controllerStatus}>
                <View
                  style={[
                    styles.controllerStatusDot,
                    inputEnabled
                      ? styles.controllerStatusDotOn
                      : styles.controllerStatusDotOff
                  ]}
                />
                <Text style={styles.controllerValue}>
                  {inputEnabled ? "ON" : "OFF"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.controllerButton}
              onPress={() => setInputEnabled((prev) => !prev)}
            >
              <Text style={styles.controllerButtonText}>
                {inputEnabled ? "Disable input" : "Enable input"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.controllerSectionTitle}>Mappings</Text>
            {controllerMappings.map((mapping) => (
              <View key={mapping.key} style={styles.controllerRow}>
                <Text style={styles.controllerLabel}>{mapping.label}</Text>
                <Text style={styles.controllerKey}>{mapping.key}</Text>
              </View>
            ))}
          </View>
        ) : null}
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
  },
  controllerPanel: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: "#12151c",
    borderWidth: 1,
    borderColor: "#2a2f3a",
    overflow: "hidden"
  },
  controllerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  controllerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  controllerToggleText: {
    color: "#9da5b4",
    fontSize: 12,
    fontWeight: "600"
  },
  controllerBody: {
    borderTopWidth: 1,
    borderTopColor: "#2a2f3a",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    gap: 10
  },
  controllerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  controllerLabel: {
    color: "#9da5b4",
    fontSize: 13
  },
  controllerValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600"
  },
  controllerKey: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700"
  },
  controllerSectionTitle: {
    marginTop: 6,
    color: "#c7cbd4",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  controllerButton: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2a2f3a",
    alignItems: "center"
  },
  controllerButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },
  controllerStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  controllerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 999
  },
  controllerStatusDotOn: {
    backgroundColor: "#2ecc71"
  },
  controllerStatusDotOff: {
    backgroundColor: "#ff7675"
  }
});
