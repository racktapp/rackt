import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMatch } from "../../src/lib/scoring/engine";
import { Format, PlayerRef, Sport } from "../../src/lib/scoring/engine";
import { getHistoryById } from "../../src/lib/history/historyStorage";
import { DEFAULT_PRESETS } from "../../src/lib/presets/defaultPresets";
import {
  clearCustomPresets,
  loadCustomPresets,
  saveCustomPresets
} from "../../src/lib/presets/presetStorage";
import { MatchPreset } from "../../src/lib/presets/types";
import { MatchConfig, saveMatch } from "../../src/lib/storage/matchStorage";
import SettingsDrawer from "../../src/components/SettingsDrawer";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";
import { supabase } from "../../lib/supabase";

const createPlayerRef = (
  name: string,
  teamId: "A" | "B",
  index: number
): PlayerRef => ({
  userId: `${teamId}-${index}`,
  name: name.trim() || `${teamId}${index}`
});

const buildPresetSubtitle = (preset: MatchPreset): string => {
  if (preset.rules.superTiebreakOnly) {
    return `Match tie-break to ${preset.rules.tiebreakTo ?? 10}`;
  }
  const setLabel = preset.rules.shortSetTo
    ? `First to ${preset.rules.shortSetTo} games`
    : preset.rules.bestOf === 1
      ? "Single set"
      : `Best of ${preset.rules.bestOf}`;
  const tiebreakLabel = preset.rules.tiebreakAt6All
    ? `TB to ${preset.rules.tiebreakTo ?? 7}`
    : "No TB";
  return `${setLabel} • ${tiebreakLabel}`;
};

const getErrorMessage = (error: unknown): string => {
  if (!error) {
    return "Unknown error";
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export default function SetupMatch() {
  const router = useRouter();
  const { colors } = useSettings();
  const params = useLocalSearchParams<{
    rematchId?: string | string[];
    presetId?: string | string[];
  }>();
  const [sport, setSport] = useState<Sport>("tennis");
  const [format, setFormat] = useState<Format>("singles");
  const [playerA1Name, setPlayerA1Name] = useState("Player A");
  const [playerA2Name, setPlayerA2Name] = useState("Player A2");
  const [playerB1Name, setPlayerB1Name] = useState("Player B");
  const [playerB2Name, setPlayerB2Name] = useState("Player B2");
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [tiebreakAt6All, setTiebreakAt6All] = useState(true);
  const [tiebreakTo, setTiebreakTo] = useState<7 | 10>(7);
  const [superTiebreakOnly, setSuperTiebreakOnly] = useState(false);
  const [shortSetTo, setShortSetTo] = useState<number | undefined>();
  const [startingServerUserId, setStartingServerUserId] = useState("A-1");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MatchPreset | null>(
    null
  );
  const [customPresets, setCustomPresets] = useState<MatchPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const isStartingRef = useRef(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const applyPreset = (preset: MatchPreset) => {
    setSelectedPreset(preset);
    setBestOf(preset.rules.bestOf);
    setTiebreakAt6All(preset.rules.tiebreakAt6All);
    setTiebreakTo(preset.rules.tiebreakTo ?? 7);
    setSuperTiebreakOnly(Boolean(preset.rules.superTiebreakOnly));
    setShortSetTo(preset.rules.shortSetTo);
    setStartingServerUserId(
      preset.rules.startingServer === "B" ? "B-1" : "A-1"
    );
  };

  useEffect(() => {
    const rematchId =
      typeof params.rematchId === "string"
        ? params.rematchId
        : params.rematchId?.[0];
    if (!rematchId) {
      return;
    }
    const record = getHistoryById(rematchId);
    if (!record) {
      return;
    }
    setSelectedPreset(null);
    setSport("tennis");
    setFormat("singles");
    setPlayerA1Name(record.players.playerAName);
    setPlayerB1Name(record.players.playerBName);
    setBestOf(record.bestOf);
    setTiebreakAt6All(record.tiebreakRule === "TIEBREAK_AT_6_ALL");
    setTiebreakTo(record.tiebreakTo ?? 7);
    setSuperTiebreakOnly(record.superTiebreakOnly ?? false);
    setShortSetTo(record.shortSetTo);
  }, [params.rematchId]);

  useEffect(() => {
    const loadedCustomPresets = loadCustomPresets();
    setCustomPresets(loadedCustomPresets);

    const presetId =
      typeof params.presetId === "string"
        ? params.presetId
        : params.presetId?.[0];
    if (!presetId || params.rematchId) {
      return;
    }
    const preset = [...DEFAULT_PRESETS, ...loadedCustomPresets].find(
      (item) => item.id === presetId
    );
    if (preset) {
      setSport("tennis");
      setFormat("singles");
      applyPreset(preset);
    }
  }, [params.presetId, params.rematchId]);

  const serverOptions = useMemo(() => {
    const options = [
      { id: "A-1", label: playerA1Name.trim() || "Player A" },
      { id: "B-1", label: playerB1Name.trim() || "Player B" }
    ];
    if (format === "doubles") {
      options.splice(1, 0, {
        id: "A-2",
        label: playerA2Name.trim() || "Player A2"
      });
      options.push({
        id: "B-2",
        label: playerB2Name.trim() || "Player B2"
      });
    }
    return options;
  }, [format, playerA1Name, playerA2Name, playerB1Name, playerB2Name]);

  useEffect(() => {
    if (sport === "badminton") {
      return;
    }
    if (!serverOptions.some((option) => option.id === startingServerUserId)) {
      setStartingServerUserId(serverOptions[0]?.id ?? "A-1");
    }
  }, [serverOptions, sport, startingServerUserId]);

  useEffect(() => {
    if (sport === "badminton") {
      setStartingServerUserId("A-1");
    }
  }, [sport]);

  const syncMatchToCloud = async (config: MatchConfig) => {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        throw userErr;
      }
      if (!user) {
        throw new Error("Not authenticated");
      }
      const userId = user.id;

      {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        console.log("syncMatchToCloud auth", { userId: user?.id, userErr });

        const payload = {
          sport: config.sport,
          format: config.format,
          is_ranked: false,
          status: "pending",
          reported_by: user?.id,
          played_at: new Date(config.startTime).toISOString()
        };

        console.log("matches insert payload", payload);
        console.log("auth.uid expected", userId);

        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .insert(payload)
          .select("id")
          .single();

        if (matchError || !matchData) {
          console.error("Supabase matches insert failed", matchError, {
            payload
          });
          Alert.alert(
            "Cloud sync failed",
            `Could not save match to cloud: ${getErrorMessage(matchError)}`
          );
          return;
        }

        const matchId = matchData.id as string;

        const { error: playersError } = await supabase
          .from("match_players")
          .insert([{ match_id: matchId, user_id: userId, side: 1 }]);

        if (playersError) {
          console.error("Supabase match_players insert failed", playersError);
          Alert.alert(
            "Cloud sync failed",
            `Could not save match to cloud: ${getErrorMessage(playersError)}`
          );
          return;
        }

        const { error: confirmationsError } = await supabase
          .from("match_confirmations")
          .insert([{ match_id: matchId, user_id: userId, status: "confirmed" }]);

        if (confirmationsError) {
          console.error(
            "Supabase match_confirmations insert failed",
            confirmationsError
          );
          Alert.alert(
            "Cloud sync failed",
            `Could not save match to cloud: ${getErrorMessage(confirmationsError)}`
          );
        }
      }
    } catch (error) {
      console.error("Supabase match sync failed", error);
      Alert.alert(
        "Cloud sync failed",
        `Could not save match to cloud: ${getErrorMessage(error)}`
      );
    }
  };

  const handleStartMatch = () => {
    if (isStartingRef.current) {
      return;
    }
    isStartingRef.current = true;
    setIsStarting(true);

    const teamAPlayers: PlayerRef[] = [
      createPlayerRef(playerA1Name, "A", 1)
    ];
    const teamBPlayers: PlayerRef[] = [
      createPlayerRef(playerB1Name, "B", 1)
    ];
    if (format === "doubles") {
      teamAPlayers.push(createPlayerRef(playerA2Name, "A", 2));
      teamBPlayers.push(createPlayerRef(playerB2Name, "B", 2));
    }
    const teamA = { id: "A" as const, players: teamAPlayers };
    const teamB = { id: "B" as const, players: teamBPlayers };
    const config: MatchConfig = {
      sport,
      format,
      teamA,
      teamB,
      bestOf: sport === "badminton" ? undefined : bestOf,
      tiebreakAt: sport === "badminton" ? undefined : tiebreakAt6All ? 6 : undefined,
      tiebreakAt6All,
      tiebreakTo: sport === "badminton" ? undefined : tiebreakTo,
      superTiebreakOnly: sport === "badminton" ? undefined : superTiebreakOnly,
      shortSetTo: sport === "badminton" ? undefined : shortSetTo,
      startingServerUserId:
        sport === "badminton" ? undefined : startingServerUserId,
      startTime: Date.now()
    };
    try {
      const matchState = createMatch(config, teamA, teamB);
      saveMatch({ config, matchState, history: [], timeline: [] });
    } catch (error) {
      console.error("Failed to start match locally", error);
      Alert.alert(
        "Match start failed",
        `Could not start match: ${getErrorMessage(error)}`
      );
      isStartingRef.current = false;
      setIsStarting(false);
      return;
    }

    router.push("/match");
    void syncMatchToCloud(config);
    isStartingRef.current = false;
    setIsStarting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>New Match</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsOpen(true)}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {selectedPreset && sport !== "badminton" ? (
          <View style={styles.presetBadge}>
            <Text style={styles.presetBadgeText}>
              Preset: {selectedPreset.title}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>Sport</Text>
          <View style={styles.toggleRow}>
            {(["tennis", "padel", "badminton"] as Sport[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.toggleButton,
                  sport === item && styles.toggleButtonActive
                ]}
                onPress={() => {
                  setSport(item);
                  if (item === "badminton") {
                    setSelectedPreset(null);
                    setSuperTiebreakOnly(false);
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    sport === item && styles.toggleTextActive
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Format</Text>
          <View style={styles.toggleRow}>
            {(["singles", "doubles"] as Format[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.toggleButton,
                  format === item && styles.toggleButtonActive
                ]}
                onPress={() => setFormat(item)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    format === item && styles.toggleTextActive
                  ]}
                >
                  {item === "singles" ? "Singles" : "Doubles"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Team A</Text>
          <TextInput
            style={styles.input}
            value={playerA1Name}
            onChangeText={setPlayerA1Name}
            placeholder="Player A"
            placeholderTextColor={colors.muted}
          />
          {format === "doubles" ? (
            <TextInput
              style={[styles.input, styles.inputStacked]}
              value={playerA2Name}
              onChangeText={setPlayerA2Name}
              placeholder="Player A2"
              placeholderTextColor={colors.muted}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Team B</Text>
          <TextInput
            style={styles.input}
            value={playerB1Name}
            onChangeText={setPlayerB1Name}
            placeholder="Player B"
            placeholderTextColor={colors.muted}
          />
          {format === "doubles" ? (
            <TextInput
              style={[styles.input, styles.inputStacked]}
              value={playerB2Name}
              onChangeText={setPlayerB2Name}
              placeholder="Player B2"
              placeholderTextColor={colors.muted}
            />
          ) : null}
        </View>

        {sport !== "badminton" ? (
          <View style={styles.section}>
            <Text style={styles.label}>Match Format</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  bestOf === 1 && styles.toggleButtonActive,
                  superTiebreakOnly && styles.toggleButtonDisabled
                ]}
                onPress={() => {
                  if (!superTiebreakOnly) {
                    setBestOf(1);
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    bestOf === 1 && styles.toggleTextActive,
                    superTiebreakOnly && styles.toggleTextDisabled
                  ]}
                >
                  Single set
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  bestOf === 3 && styles.toggleButtonActive,
                  superTiebreakOnly && styles.toggleButtonDisabled
                ]}
                onPress={() => {
                  if (!superTiebreakOnly) {
                    setBestOf(3);
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    bestOf === 3 && styles.toggleTextActive,
                    superTiebreakOnly && styles.toggleTextDisabled
                  ]}
                >
                  Best of 3
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  bestOf === 5 && styles.toggleButtonActive,
                  superTiebreakOnly && styles.toggleButtonDisabled
                ]}
                onPress={() => {
                  if (!superTiebreakOnly) {
                    setBestOf(5);
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    bestOf === 5 && styles.toggleTextActive,
                    superTiebreakOnly && styles.toggleTextDisabled
                  ]}
                >
                  Best of 5
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.helperText}>
              Badminton uses rally scoring to 21 (win by 2, cap at 30).
            </Text>
          </View>
        )}

      {sport !== "badminton" ? (
        <>
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Super tie-break only</Text>
              <Switch
                value={superTiebreakOnly}
                onValueChange={(value) => {
                  setSuperTiebreakOnly(value);
                  if (value) {
                    setBestOf(1);
                    setTiebreakAt6All(true);
                    setTiebreakTo(10);
                    setShortSetTo(undefined);
                  } else {
                    setTiebreakTo(7);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
              />
            </View>
            <Text style={styles.helperText}>
              Toggle on for a single match tie-break to {tiebreakTo} points (win
              by 2).
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Short set (first to 4 games)</Text>
              <Switch
                value={Boolean(shortSetTo)}
                onValueChange={(value) => {
                  setShortSetTo(value ? 4 : undefined);
                  if (value) {
                    setSuperTiebreakOnly(false);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
              />
            </View>
            <Text style={styles.helperText}>
              Great for warm-ups and practice reps.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Tie-break at 6–6</Text>
              <Switch
                value={tiebreakAt6All}
                onValueChange={setTiebreakAt6All}
                disabled={superTiebreakOnly}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
              />
            </View>
          </View>

          {(tiebreakAt6All || superTiebreakOnly) && (
            <View style={styles.section}>
              <Text style={styles.label}>Tie-break target</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    tiebreakTo === 7 && styles.toggleButtonActive
                  ]}
                  onPress={() => setTiebreakTo(7)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      tiebreakTo === 7 && styles.toggleTextActive
                    ]}
                  >
                    First to 7
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    tiebreakTo === 10 && styles.toggleButtonActive
                  ]}
                  onPress={() => setTiebreakTo(10)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      tiebreakTo === 10 && styles.toggleTextActive
                    ]}
                  >
                    First to 10
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Starting Server</Text>
            <View style={styles.toggleRow}>
              {serverOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.toggleButton,
                    startingServerUserId === option.id &&
                      styles.toggleButtonActive
                  ]}
                  onPress={() => setStartingServerUserId(option.id)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      startingServerUserId === option.id &&
                        styles.toggleTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : null}

      <TouchableOpacity
        style={[styles.startButton, isStarting && styles.startButtonDisabled]}
        onPress={handleStartMatch}
        disabled={isStarting}
      >
        <View style={styles.startButtonContent}>
          {isStarting ? (
            <ActivityIndicator size="small" color="#0B1220" />
          ) : null}
          <Text style={styles.startButtonText}>
            {isStarting ? "Starting..." : "Start Match"}
          </Text>
        </View>
      </TouchableOpacity>

      {sport !== "badminton" ? (
        <View style={styles.section}>
          <Text style={styles.label}>Save as new preset</Text>
          <TextInput
            style={styles.input}
            value={presetName}
            onChangeText={setPresetName}
            placeholder="Preset name"
            placeholderTextColor={colors.muted}
          />
          <View style={styles.presetActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                const name = presetName.trim();
                if (!name) {
                  Alert.alert("Name required", "Add a preset name to save.");
                  return;
                }
                const startingServer =
                  startingServerUserId.startsWith("B") ? "B" : "A";
                const preset: MatchPreset = {
                  id: `custom-${Date.now()}`,
                  title: name,
                  subtitle: buildPresetSubtitle({
                    id: "custom",
                    title: name,
                    subtitle: "",
                    rules: {
                      bestOf,
                      tiebreakAt6All,
                      tiebreakTo,
                      superTiebreakOnly,
                      shortSetTo,
                      startingServer
                    }
                  }),
                  rules: {
                    bestOf,
                    tiebreakAt6All,
                    tiebreakTo,
                    superTiebreakOnly,
                    shortSetTo,
                    startingServer
                  }
                };
                const nextPresets = [...customPresets, preset];
                saveCustomPresets(nextPresets);
                setCustomPresets(nextPresets);
                setSelectedPreset(preset);
                setPresetName("");
                Alert.alert(
                  "Preset saved",
                  "Your new preset is ready in Quick Presets."
                );
              }}
            >
              <Text style={styles.secondaryButtonText}>Save preset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => {
                clearCustomPresets();
                setCustomPresets([]);
                if (
                  selectedPreset &&
                  !DEFAULT_PRESETS.some((preset) => preset.id === selectedPreset.id)
                ) {
                  setSelectedPreset(null);
                }
                Alert.alert("Presets reset", "Custom presets cleared.");
              }}
            >
              <Text style={styles.ghostButtonText}>Reset to default presets</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
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
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 120
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24
    },
    settingsButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardAlt,
      borderWidth: 1,
      borderColor: colors.border
    },
    settingsButtonText: {
      fontSize: 16
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    presetBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.cardAlt,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16
    },
    presetBadgeText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600"
    },
    section: {
      marginBottom: 18
    },
    label: {
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      color: colors.muted,
      marginBottom: 8
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border
    },
    inputStacked: {
      marginTop: 10
    },
    toggleRow: {
      flexDirection: "row",
      gap: 12,
      flexWrap: "wrap"
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border
    },
    toggleButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    toggleButtonDisabled: {
      opacity: 0.5
    },
    toggleText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600"
    },
    toggleTextActive: {
      color: "#0B1220"
    },
    toggleTextDisabled: {
      color: colors.muted
    },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    helperText: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 13
    },
    startButton: {
      marginTop: 16,
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center"
    },
    startButtonDisabled: {
      opacity: 0.7
    },
    startButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    startButtonText: {
      color: "#0B1220",
      fontSize: 18,
      fontWeight: "700"
    },
    presetActions: {
      marginTop: 12,
      gap: 12
    },
    secondaryButton: {
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.cardAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center"
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: "600"
    },
    ghostButton: {
      paddingVertical: 8,
      alignItems: "center"
    },
    ghostButtonText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "600"
    }
  });
