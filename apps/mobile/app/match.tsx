import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
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
import {
  applyTimelineUpdate,
  deriveTimelineEvent,
  TimelineEvent
} from "../src/lib/match/timeline";

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

const pointDisplay = (state: TennisState, player: Player): string => {
  const ownPoints = player === "A" ? state.gamePointsA : state.gamePointsB;
  const opponentPoints = player === "A" ? state.gamePointsB : state.gamePointsA;
  if (ownPoints >= 3 && opponentPoints >= 3) {
    if (ownPoints === opponentPoints) {
      return "40";
    }
    return ownPoints > opponentPoints ? "Ad" : "40";
  }
  return pointLabel(ownPoints);
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

const useHighlight = (value: string | number) => {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 160,
        useNativeDriver: false
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false
      })
    ]).start();
  }, [animation, value]);

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["#151923", "#2f80ed"]
  });

  const borderColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["#2a2f3a", "#7fb4ff"]
  });

  return { backgroundColor, borderColor };
};

export default function MatchScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [state, setState] = useState<TennisState | null>(null);
  const [history, setHistory] = useState<TennisState[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [controllerExpanded, setControllerExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  useEffect(() => {
    const stored = loadMatch();
    if (!stored) {
      router.replace("/");
      return;
    }
    setConfig(stored.config);
    setState(stored.tennisState);
    setHistory(stored.history);
    setTimeline(stored.timeline ?? []);
  }, [router]);

  useEffect(() => {
    if (!config || !state) {
      return;
    }
    saveMatch({ config, tennisState: state, history, timeline });
  }, [config, history, state, timeline]);

  const currentSet = useMemo(() => {
    if (!state) {
      return null;
    }
    return state.sets[state.currentSet];
  }, [state]);

  const matchStatus = useMemo(() => {
    if (!state || !config || !currentSet) {
      return "";
    }
    if (state.matchWinner) {
      return `Match won by ${
        state.matchWinner === "A"
          ? config.playerAName
          : config.playerBName
      }`;
    }
    if (state.isTiebreak) {
      return `Tie-break • ${state.tiebreakPointsA}–${state.tiebreakPointsB}`;
    }
    const gameNumber = currentSet.gamesA + currentSet.gamesB + 1;
    return `Set ${state.currentSet + 1} • Game ${gameNumber} • ${gameScoreLabel(
      state
    )}`;
  }, [config, currentSet, state]);

  const gamesAValue = currentSet?.gamesA ?? 0;
  const gamesBValue = currentSet?.gamesB ?? 0;
  const pointsAValue = state?.isTiebreak
    ? state.tiebreakPointsA
    : state?.gamePointsA ?? 0;
  const pointsBValue = state?.isTiebreak
    ? state.tiebreakPointsB
    : state?.gamePointsB ?? 0;
  const pointsALabel =
    state && state.isTiebreak
      ? `${pointsAValue}`
      : state
        ? pointDisplay(state, "A")
        : "0";
  const pointsBLabel =
    state && state.isTiebreak
      ? `${pointsBValue}`
      : state
        ? pointDisplay(state, "B")
        : "0";

  const gamesAHighlight = useHighlight(gamesAValue);
  const gamesBHighlight = useHighlight(gamesBValue);
  const pointsAHighlight = useHighlight(pointsALabel);
  const pointsBHighlight = useHighlight(pointsBLabel);

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
    setTimeline([]);
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
        setTimeline((timelinePrev) =>
          applyTimelineUpdate(timelinePrev, { type: "UNDO" }, null)
        );
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
            const next = applyAction(prev, action);
            setHistory((historyPrev) => [...historyPrev, prev]);
            const event = deriveTimelineEvent(prev, next, action);
            if (event) {
              setTimeline((timelinePrev) =>
                applyTimelineUpdate(timelinePrev, action, event)
              );
            }
            return next;
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

  const formatTimelineEvent = useCallback(
    (event: TimelineEvent): string => {
      const playerName =
        event.player === "A"
          ? config?.playerAName
          : event.player === "B"
            ? config?.playerBName
            : undefined;
      switch (event.type) {
        case "POINT":
          return playerName ? `${playerName} won point` : "Point won";
        case "GAME":
          return playerName ? `Game won by ${playerName}` : "Game won";
        case "SET":
          return playerName ? `Set won by ${playerName}` : "Set won";
        case "TIEBREAK_START":
          return "Tie-break started";
        case "MATCH_END":
          return playerName ? `Match won by ${playerName}` : "Match won";
        default:
          return event.label;
      }
    },
    [config]
  );

  if (!config || !state) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Loading match...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Scoreboard</Text>
          <Text style={styles.subTitle}>
            Best of {config.bestOf} • Tie-break{" "}
            {config.tiebreakAt6All ? "On" : "Off"}
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Match status</Text>
            <TouchableOpacity
              style={styles.resetScoreButton}
              onPress={confirmResetScores}
            >
              <Text style={styles.resetScoreText}>Reset Score</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusValue}>{matchStatus}</Text>
          <Text style={styles.serverLine}>
            Serving: {serverLabel(state.server, config)}
          </Text>
        </View>

        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <View style={styles.playerNameRow}>
              <View
                style={[
                  styles.serverDot,
                  state.server === "A"
                    ? styles.serverDotActive
                    : styles.serverDotInactive
                ]}
              />
              <Text style={styles.playerName}>{config.playerAName}</Text>
            </View>
            <View style={styles.setRow}>
              {state.sets.map((set, index) => (
                <View
                  key={`set-a-${index}`}
                  style={[
                    styles.setBox,
                    index === state.currentSet && styles.setBoxActive
                  ]}
                >
                  <Text style={styles.setBoxText}>{set.gamesA}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.scoreRow}>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Games</Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.gamesBox,
                  gamesAHighlight
                ]}
              >
                <Text style={styles.gamesValue}>{gamesAValue}</Text>
              </Animated.View>
            </View>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>
                {state.isTiebreak ? "TB Points" : "Points"}
              </Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.pointsBox,
                  pointsAHighlight
                ]}
              >
                <Text style={styles.pointsValue}>{pointsALabel}</Text>
              </Animated.View>
            </View>
          </View>
        </View>

        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <View style={styles.playerNameRow}>
              <View
                style={[
                  styles.serverDot,
                  state.server === "B"
                    ? styles.serverDotActive
                    : styles.serverDotInactive
                ]}
              />
              <Text style={styles.playerName}>{config.playerBName}</Text>
            </View>
            <View style={styles.setRow}>
              {state.sets.map((set, index) => (
                <View
                  key={`set-b-${index}`}
                  style={[
                    styles.setBox,
                    index === state.currentSet && styles.setBoxActive
                  ]}
                >
                  <Text style={styles.setBoxText}>{set.gamesB}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.scoreRow}>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Games</Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.gamesBox,
                  gamesBHighlight
                ]}
              >
                <Text style={styles.gamesValue}>{gamesBValue}</Text>
              </Animated.View>
            </View>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>
                {state.isTiebreak ? "TB Points" : "Points"}
              </Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.pointsBox,
                  pointsBHighlight
                ]}
              >
                <Text style={styles.pointsValue}>{pointsBLabel}</Text>
              </Animated.View>
            </View>
          </View>
        </View>

        <View style={styles.timelinePanel}>
          <TouchableOpacity
            style={styles.timelineHeader}
            onPress={() => setTimelineExpanded((prev) => !prev)}
          >
            <Text style={styles.timelineTitle}>Timeline</Text>
            <View style={styles.timelineHeaderMeta}>
              <Text style={styles.timelineCount}>{timeline.length}</Text>
              <Text style={styles.timelineToggleText}>
                {timelineExpanded ? "Hide" : "Show"}
              </Text>
            </View>
          </TouchableOpacity>
          {timelineExpanded ? (
            <View style={styles.timelineBody}>
              {timeline.length === 0 ? (
                <Text style={styles.timelineEmpty}>
                  No events yet. Score a point to get started.
                </Text>
              ) : (
                timeline.map((event) => (
                  <View key={event.id} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>
                        {formatTimelineEvent(event)}
                      </Text>
                      <Text style={styles.timelineTime}>
                        {new Date(event.ts).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
            <Text style={styles.secondaryButtonText}>Reset Match</Text>
          </TouchableOpacity>
        </View>

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
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => handleAction({ type: "POINT_A" })}
        >
          <Text style={styles.actionButtonText}>
            Point {config.playerAName}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => handleAction({ type: "UNDO" })}
        >
          <Text style={styles.actionButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => handleAction({ type: "POINT_B" })}
        >
          <Text style={styles.actionButtonText}>
            Point {config.playerBName}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0f"
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140,
    gap: 18
  },
  header: {
    alignItems: "center",
    marginBottom: 6
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff"
  },
  subTitle: {
    marginTop: 6,
    textAlign: "center",
    color: "#9da5b4"
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
  statusCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#12151c",
    borderWidth: 1,
    borderColor: "#242a36"
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  statusLabel: {
    color: "#9da5b4",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  statusValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10
  },
  serverLine: {
    color: "#9da5b4",
    fontSize: 13,
    marginTop: 8
  },
  resetScoreButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2f3947"
  },
  resetScoreText: {
    color: "#d0d4dc",
    fontSize: 12,
    fontWeight: "600"
  },
  playerCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#11141b",
    borderWidth: 1,
    borderColor: "#242a36",
    gap: 16
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  playerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  playerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },
  serverDot: {
    width: 10,
    height: 10,
    borderRadius: 999
  },
  serverDotActive: {
    backgroundColor: "#2ecc71"
  },
  serverDotInactive: {
    backgroundColor: "#2a2f3a"
  },
  setRow: {
    flexDirection: "row",
    gap: 8
  },
  setBox: {
    minWidth: 28,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#151923",
    borderWidth: 1,
    borderColor: "#2a2f3a",
    alignItems: "center"
  },
  setBoxActive: {
    borderColor: "#7fb4ff",
    backgroundColor: "#1a2232"
  },
  setBoxText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700"
  },
  scoreRow: {
    flexDirection: "row",
    gap: 16
  },
  scoreColumn: {
    flex: 1,
    gap: 8
  },
  scoreLabel: {
    color: "#9da5b4",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  scoreValueBox: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#2a2f3a",
    alignItems: "center"
  },
  gamesBox: {
    backgroundColor: "#151923"
  },
  pointsBox: {
    backgroundColor: "#111722"
  },
  gamesValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700"
  },
  pointsValue: {
    color: "#cfe1ff",
    fontSize: 22,
    fontWeight: "600"
  },
  timelinePanel: {
    borderRadius: 16,
    backgroundColor: "#12151c",
    borderWidth: 1,
    borderColor: "#242a36",
    overflow: "hidden"
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  timelineTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  timelineHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  timelineCount: {
    color: "#9da5b4",
    fontSize: 12,
    fontWeight: "600"
  },
  timelineToggleText: {
    color: "#9da5b4",
    fontSize: 12,
    fontWeight: "600"
  },
  timelineBody: {
    borderTopWidth: 1,
    borderTopColor: "#242a36",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  timelineEmpty: {
    color: "#9da5b4",
    fontSize: 13
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: "#2f80ed"
  },
  timelineContent: {
    flex: 1,
    gap: 4
  },
  timelineLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500"
  },
  timelineTime: {
    color: "#9da5b4",
    fontSize: 12
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2f3a"
  },
  secondaryButtonText: {
    color: "#ff8b8b",
    fontSize: 13,
    fontWeight: "600"
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(11, 11, 15, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#1d222d"
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  actionButtonPrimary: {
    backgroundColor: "#2f80ed"
  },
  actionButtonSecondary: {
    backgroundColor: "#1c1f26"
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  },
  controllerPanel: {
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
