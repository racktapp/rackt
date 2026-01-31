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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getDisplayScore,
  getServer,
  resetMatch
} from "../src/lib/scoring/engine";
import { MatchState } from "../src/lib/scoring/engine";
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
import {
  getPressure,
  PressureIndicator,
  PressureType
} from "../src/lib/match/pressure";
import SettingsDrawer from "../src/components/SettingsDrawer";
import { ThemeColors, useSettings } from "../src/components/SettingsProvider";
import { triggerHaptics } from "../src/lib/feedback/haptics";
import { playSound } from "../src/lib/feedback/sound";

const formatTeamName = (config: MatchConfig, teamId: "A" | "B") => {
  const team = teamId === "A" ? config.teamA : config.teamB;
  return team.players.map((player) => player.name).join(" / ");
};

const useScorePulse = (value: string | number) => {
  const animation = useRef(new Animated.Value(0)).current;
  const previousValue = useRef(value);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }
    previousValue.current = value;
    setChanged(true);
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
    const timeout = setTimeout(() => setChanged(false), 420);
    return () => clearTimeout(timeout);
  }, [animation, value]);

  const borderColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["#2a2f3a", "#6aa7ff"]
  });

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04]
  });

  return { pulseStyle: { borderColor, transform: [{ scale }] }, changed };
};

const pressureLabel: Record<PressureType, string> = {
  MATCH_POINT: "Match Point",
  SET_POINT: "Set Point",
  BREAK_POINT: "Break Point"
};

export default function MatchScreen() {
  const router = useRouter();
  const { settings, colors } = useSettings();
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [state, setState] = useState<MatchState | null>(null);
  const [history, setHistory] = useState<MatchState[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [controllerExpanded, setControllerExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasAutoNavigated = useRef(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const PressureBadge = ({ indicator }: { indicator: PressureIndicator }) => {
    const badgeStyle =
      indicator.type === "MATCH_POINT"
        ? styles.pressureBadgeMatch
        : indicator.type === "SET_POINT"
          ? styles.pressureBadgeSet
          : styles.pressureBadgeBreak;
    return (
      <View style={[styles.pressureBadge, badgeStyle]}>
        <Text style={styles.pressureBadgeText}>
          {pressureLabel[indicator.type]}
        </Text>
      </View>
    );
  };

  useEffect(() => {
    const stored = loadMatch();
    if (!stored) {
      router.replace("/(tabs)");
      return;
    }
    setConfig(stored.config);
    setState(stored.matchState);
    setHistory(stored.history);
    setTimeline(stored.timeline ?? []);
  }, [router]);

  useEffect(() => {
    if (!config || !state) {
      return;
    }
    saveMatch({ config, matchState: state, history, timeline });
  }, [config, history, state, timeline]);

  useEffect(() => {
    if (!state?.score.matchWinner) {
      return;
    }
    if (hasAutoNavigated.current) {
      return;
    }
    hasAutoNavigated.current = true;
    router.replace("/summary");
  }, [router, state?.score.matchWinner]);

  const currentSet = useMemo(() => {
    if (!state || state.score.sport === "badminton") {
      return null;
    }
    return state.score.sets[state.score.currentSet];
  }, [state]);

  const matchStatus = useMemo(() => {
    if (!state || !config) {
      return "";
    }
    if (state.score.matchWinner) {
      return `Match won by ${
        state.score.matchWinner === "A"
          ? formatTeamName(config, "A")
          : formatTeamName(config, "B")
      }`;
    }
    if (state.score.sport === "badminton") {
      const currentGame = state.score.games[state.score.currentGame];
      return `Game ${state.score.currentGame + 1} • ${currentGame?.pointsA ?? 0}–${
        currentGame?.pointsB ?? 0
      }`;
    }
    if (state.score.isTiebreak) {
      const label = config.superTiebreakOnly ? "Match tie-break" : "Tie-break";
      return `${label} • ${state.score.tiebreakPointsA}–${state.score.tiebreakPointsB}`;
    }
    const setScore = `${currentSet?.gamesA ?? 0}–${currentSet?.gamesB ?? 0}`;
    const display = getDisplayScore(state);
    const gameScoreLabel =
      display.sport === "badminton"
        ? ""
        : display.isTiebreak
          ? `${display.tiebreakPointsA}–${display.tiebreakPointsB}`
          : `${display.pointLabelA}–${display.pointLabelB}`;
    return `Set ${state.score.currentSet + 1} • ${setScore} • ${gameScoreLabel}`;
  }, [config, currentSet, state]);

  const rulesLabel = useMemo(() => {
    if (!config) {
      return "";
    }
    if (config.sport === "badminton") {
      return `Best of ${config.gamesToWin ?? 2} • First to ${
        config.pointsToWinGame ?? 21
      }`;
    }
    if (config.superTiebreakOnly) {
      return `Match tie-break to ${config.tiebreakTo}`;
    }
    const setLabel = config.shortSetTo
      ? `First to ${config.shortSetTo} games`
      : `Best of ${config.bestOf ?? 3}`;
    const tiebreakLabel = (config.tiebreakAt ?? 6) === 6
      ? `TB to ${config.tiebreakTo}`
      : "No TB";
    return `${setLabel} • ${tiebreakLabel}`;
  }, [config]);

  const pressure = useMemo(
    () => (state && config ? getPressure(state, config) : null),
    [config, state]
  );

  const displayScore = state ? getDisplayScore(state) : null;
  const gamesAValue =
    displayScore?.sport === "badminton"
      ? displayScore.gamesWonA
      : displayScore?.gamesA ?? 0;
  const gamesBValue =
    displayScore?.sport === "badminton"
      ? displayScore.gamesWonB
      : displayScore?.gamesB ?? 0;
  const pointsAValue =
    displayScore?.sport === "badminton"
      ? displayScore.pointsA
      : displayScore?.isTiebreak
        ? displayScore.tiebreakPointsA
        : displayScore?.pointsA ?? 0;
  const pointsBValue =
    displayScore?.sport === "badminton"
      ? displayScore.pointsB
      : displayScore?.isTiebreak
        ? displayScore.tiebreakPointsB
        : displayScore?.pointsB ?? 0;
  const pointsALabel =
    displayScore?.sport === "badminton"
      ? `${pointsAValue}`
      : displayScore?.pointLabelA ?? "0";
  const pointsBLabel =
    displayScore?.sport === "badminton"
      ? `${pointsBValue}`
      : displayScore?.pointLabelB ?? "0";

  const gamesAPulse = useScorePulse(gamesAValue);
  const gamesBPulse = useScorePulse(gamesBValue);
  const pointsAPulse = useScorePulse(pointsALabel);
  const pointsBPulse = useScorePulse(pointsBLabel);

  const resetScores = useCallback(() => {
    if (!config) {
      return;
    }
    triggerHaptics(settings, "reset");
    setConfig((prev) =>
      prev ? { ...prev, startTime: Date.now() } : prev
    );
    setState((prev) => (prev ? resetMatch(prev, config) : prev));
    setHistory([]);
    setTimeline([]);
  }, [config, settings]);

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
    router.replace("/(tabs)");
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
        triggerHaptics(settings, "undo");
        playSound(settings, "undo");
      }
      return nextHistory;
    });
  }, [settings]);

  const handleAction = useCallback(
    (action: InputAction) => {
      switch (action.type) {
        case "POINT_A":
        case "POINT_B": {
          triggerHaptics(settings, "point");
          playSound(settings, "point");
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
    [confirmResetScores, handleUndo, settings]
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
      if (!config) {
        return event.label;
      }
      const playerName =
        event.player === "A"
          ? formatTeamName(config, "A")
          : event.player === "B"
            ? formatTeamName(config, "B")
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.label}>Loading match...</Text>
      </SafeAreaView>
    );
  }

  const matchFinished = Boolean(state.score.matchWinner);
  const server = getServer(state);
  const serverTeamName = formatTeamName(config, server.teamId);
  const serverPlayer =
    config[server.teamId === "A" ? "teamA" : "teamB"].players.find(
      (player) => player.userId === server.playerUserId
    );
  const isBadminton = config.sport === "badminton";
  const serverLabel = isBadminton
    ? serverTeamName
    : serverPlayer?.name ?? serverTeamName;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Scoreboard</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setSettingsOpen(true)}
            >
              <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subTitle}>{rulesLabel}</Text>
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
          <View style={styles.servingLine}>
            <View style={styles.servingDot} />
            <Text style={styles.serverLine}>
              Serving {serverLabel}
            </Text>
          </View>
        </View>

        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <View style={styles.playerNameRow}>
              <View
                style={[
                  styles.serverDot,
                  server.teamId === "A"
                    ? styles.serverDotActive
                    : styles.serverDotInactive
                ]}
              />
              <Text style={styles.playerName}>
                {formatTeamName(config, "A")}
              </Text>
              {server.teamId === "A" ? (
                <View style={styles.servingBadge}>
                  <View style={styles.servingBadgeDot} />
                  <Text style={styles.servingBadgeText}>
                    {isBadminton
                      ? "Serving"
                      : `Serving ${serverPlayer?.name ?? ""}`}
                  </Text>
                </View>
              ) : null}
              {pressure?.player === "A" ? (
                <PressureBadge indicator={pressure} />
              ) : null}
            </View>
            <View style={styles.setRow}>
              {displayScore && displayScore.sport !== "badminton"
                ? displayScore.sets.map((set, index) => (
                    <View
                      key={`set-a-${index}`}
                      style={[
                        styles.setBox,
                        index === displayScore.currentSet &&
                          styles.setBoxActive
                      ]}
                    >
                      <Text style={styles.setBoxText}>{set.gamesA}</Text>
                    </View>
                  ))
                : null}
            </View>
          </View>
          <View style={styles.scoreRow}>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Games</Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.gamesBox,
                  gamesAPulse.pulseStyle,
                  gamesAPulse.changed && styles.scoreValueChanged
                ]}
              >
                <Text style={styles.gamesValue}>{gamesAValue}</Text>
              </Animated.View>
            </View>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>
                {displayScore?.sport === "badminton"
                  ? "Points"
                  : displayScore?.isTiebreak
                    ? "TB Points"
                    : "Points"}
              </Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.pointsBox,
                  pointsAPulse.pulseStyle,
                  pointsAPulse.changed && styles.scoreValueChanged
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
                  server.teamId === "B"
                    ? styles.serverDotActive
                    : styles.serverDotInactive
                ]}
              />
              <Text style={styles.playerName}>
                {formatTeamName(config, "B")}
              </Text>
              {server.teamId === "B" ? (
                <View style={styles.servingBadge}>
                  <View style={styles.servingBadgeDot} />
                  <Text style={styles.servingBadgeText}>
                    {isBadminton
                      ? "Serving"
                      : `Serving ${serverPlayer?.name ?? ""}`}
                  </Text>
                </View>
              ) : null}
              {pressure?.player === "B" ? (
                <PressureBadge indicator={pressure} />
              ) : null}
            </View>
            <View style={styles.setRow}>
              {displayScore && displayScore.sport !== "badminton"
                ? displayScore.sets.map((set, index) => (
                    <View
                      key={`set-b-${index}`}
                      style={[
                        styles.setBox,
                        index === displayScore.currentSet &&
                          styles.setBoxActive
                      ]}
                    >
                      <Text style={styles.setBoxText}>{set.gamesB}</Text>
                    </View>
                  ))
                : null}
            </View>
          </View>
          <View style={styles.scoreRow}>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>Games</Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.gamesBox,
                  gamesBPulse.pulseStyle,
                  gamesBPulse.changed && styles.scoreValueChanged
                ]}
              >
                <Text style={styles.gamesValue}>{gamesBValue}</Text>
              </Animated.View>
            </View>
            <View style={styles.scoreColumn}>
              <Text style={styles.scoreLabel}>
                {displayScore?.sport === "badminton"
                  ? "Points"
                  : displayScore?.isTiebreak
                    ? "TB Points"
                    : "Points"}
              </Text>
              <Animated.View
                style={[
                  styles.scoreValueBox,
                  styles.pointsBox,
                  pointsBPulse.pulseStyle,
                  pointsBPulse.changed && styles.scoreValueChanged
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
        {matchFinished ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => router.replace("/summary")}
            >
              <Text
                style={[styles.actionButtonText, styles.actionButtonTextLight]}
              >
                View Summary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={handleReset}
            >
              <Text style={styles.actionButtonText}>New Match</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => handleAction({ type: "POINT_A" })}
            >
              <Text
                style={[styles.actionButtonText, styles.actionButtonTextLight]}
              >
                Point {formatTeamName(config, "A")}
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
              <Text
                style={[styles.actionButtonText, styles.actionButtonTextLight]}
              >
                Point {formatTeamName(config, "B")}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <SettingsDrawer
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 140,
      gap: 18
    },
    header: {
      marginBottom: 6,
      gap: 6
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    settingsButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border
    },
    settingsButtonText: {
      fontSize: 15
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subTitle: {
      marginTop: 6,
      textAlign: "center",
      color: colors.muted
    },
    label: {
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 1.4,
      color: colors.muted,
      marginBottom: 6
    },
    value: {
      fontSize: 22,
      fontWeight: "600",
      color: colors.text
    },
    statusCard: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    statusHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    statusLabel: {
      color: colors.muted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1
    },
    statusValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginTop: 10
    },
    servingLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10
    },
    serverLine: {
      color: colors.muted,
      fontSize: 13
    },
    servingDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: "#2ecc71"
    },
    resetScoreButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border
    },
    resetScoreText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600"
    },
    playerCard: {
      borderRadius: 18,
      padding: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      gap: 10,
      flexWrap: "wrap"
    },
    playerName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700"
    },
    servingBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt
    },
    servingBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: "#2ecc71"
    },
    servingBadgeText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "600"
    },
    pressureBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt
    },
    pressureBadgeText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.2
    },
    pressureBadgeBreak: {
      borderColor: colors.accent
    },
    pressureBadgeSet: {
      borderColor: "#7fb4ff"
    },
    pressureBadgeMatch: {
      borderColor: "#ff8b8b"
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
      backgroundColor: colors.border
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
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center"
    },
    setBoxActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface
    },
    setBoxText: {
      color: colors.text,
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
      color: colors.muted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1
    },
    scoreValueBox: {
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center"
    },
    scoreValueChanged: {
      shadowColor: colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 3
    },
    gamesBox: {
      backgroundColor: colors.surfaceAlt
    },
    pointsBox: {
      backgroundColor: colors.surface
    },
    gamesValue: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "700"
    },
    pointsValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "600"
    },
    timelinePanel: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      fontSize: 16,
      fontWeight: "600"
    },
    timelineHeaderMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    timelineCount: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600"
    },
    timelineToggleText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600"
    },
    timelineBody: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12
    },
    timelineEmpty: {
      color: colors.muted,
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
      backgroundColor: colors.accent
    },
    timelineContent: {
      flex: 1,
      gap: 4
    },
    timelineLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500"
    },
    timelineTime: {
      color: colors.muted,
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
      borderColor: colors.border
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
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    actionButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center"
    },
    actionButtonPrimary: {
      backgroundColor: colors.accent
    },
    actionButtonSecondary: {
      backgroundColor: colors.surfaceAlt
    },
    actionButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center"
    },
    actionButtonTextLight: {
      color: "#fff"
    },
    controllerPanel: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      fontSize: 16,
      fontWeight: "600"
    },
    controllerToggleText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600"
    },
    controllerBody: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
      color: colors.muted,
      fontSize: 13
    },
    controllerValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600"
    },
    controllerKey: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700"
    },
    controllerSectionTitle: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1
    },
    controllerButton: {
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center"
    },
    controllerButtonText: {
      color: colors.text,
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
