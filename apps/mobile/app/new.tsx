import { useEffect, useMemo, useState } from "react";
import {
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
import { initialState } from "../src/lib/tennis/engine";
import { Player } from "../src/lib/tennis/types";
import { getHistoryById } from "../src/lib/history/historyStorage";
import { DEFAULT_PRESETS } from "../src/lib/presets/defaultPresets";
import {
  clearCustomPresets,
  loadCustomPresets,
  saveCustomPresets
} from "../src/lib/presets/presetStorage";
import { MatchPreset } from "../src/lib/presets/types";
import { MatchConfig, saveMatch } from "../src/lib/storage/matchStorage";
import SettingsDrawer from "../src/components/SettingsDrawer";
import { ThemeColors, useSettings } from "../src/components/SettingsProvider";

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

export default function SetupMatch() {
  const router = useRouter();
  const { colors } = useSettings();
  const params = useLocalSearchParams<{
    rematchId?: string | string[];
    presetId?: string | string[];
  }>();
  const [playerAName, setPlayerAName] = useState("Player A");
  const [playerBName, setPlayerBName] = useState("Player B");
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [tiebreakAt6All, setTiebreakAt6All] = useState(true);
  const [tiebreakTo, setTiebreakTo] = useState<7 | 10>(7);
  const [superTiebreakOnly, setSuperTiebreakOnly] = useState(false);
  const [shortSetTo, setShortSetTo] = useState<number | undefined>();
  const [startingServer, setStartingServer] = useState<Player>("A");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MatchPreset | null>(
    null
  );
  const [customPresets, setCustomPresets] = useState<MatchPreset[]>([]);
  const [presetName, setPresetName] = useState("");

  const styles = useMemo(() => createStyles(colors), [colors]);

  const applyPreset = (preset: MatchPreset) => {
    setSelectedPreset(preset);
    setBestOf(preset.rules.bestOf);
    setTiebreakAt6All(preset.rules.tiebreakAt6All);
    setTiebreakTo(preset.rules.tiebreakTo ?? 7);
    setSuperTiebreakOnly(Boolean(preset.rules.superTiebreakOnly));
    setShortSetTo(preset.rules.shortSetTo);
    setStartingServer(preset.rules.startingServer ?? "A");
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
    setPlayerAName(record.players.playerAName);
    setPlayerBName(record.players.playerBName);
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
      applyPreset(preset);
    }
  }, [params.presetId, params.rematchId]);

  const handleStartMatch = () => {
    const config: MatchConfig = {
      playerAName: playerAName.trim() || "Player A",
      playerBName: playerBName.trim() || "Player B",
      bestOf,
      tiebreakAt6All,
      tiebreakTo,
      superTiebreakOnly,
      shortSetTo,
      startingServer,
      startTime: Date.now()
    };
    const tennisState = initialState({
      bestOf: config.bestOf,
      tiebreakAt6All: config.tiebreakAt6All,
      tiebreakTo: config.tiebreakTo,
      superTiebreakOnly: config.superTiebreakOnly,
      shortSetTo: config.shortSetTo,
      startingServer: config.startingServer
    });
    saveMatch({ config, tennisState, history: [], timeline: [] });
    router.push("/match");
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

      {selectedPreset ? (
        <View style={styles.presetBadge}>
          <Text style={styles.presetBadgeText}>
            Preset: {selectedPreset.title}
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Player A Name</Text>
        <TextInput
          style={styles.input}
          value={playerAName}
          onChangeText={setPlayerAName}
          placeholder="Player A"
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Player B Name</Text>
        <TextInput
          style={styles.input}
          value={playerBName}
          onChangeText={setPlayerBName}
          placeholder="Player B"
          placeholderTextColor={colors.muted}
        />
      </View>

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
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>
        <Text style={styles.helperText}>
          Toggle on for a single match tie-break to {tiebreakTo} points (win by
          2).
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
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
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
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
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
          <TouchableOpacity
            style={[
              styles.toggleButton,
              startingServer === "A" && styles.toggleButtonActive
            ]}
            onPress={() => setStartingServer("A")}
          >
            <Text
              style={[
                styles.toggleText,
                startingServer === "A" && styles.toggleTextActive
              ]}
            >
              {playerAName.trim() || "Player A"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              startingServer === "B" && styles.toggleButtonActive
            ]}
            onPress={() => setStartingServer("B")}
          >
            <Text
              style={[
                styles.toggleText,
                startingServer === "B" && styles.toggleTextActive
              ]}
            >
              {playerBName.trim() || "Player B"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={handleStartMatch}>
        <Text style={styles.startButtonText}>Start Match</Text>
      </TouchableOpacity>

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
      backgroundColor: colors.background
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
      backgroundColor: colors.surfaceAlt,
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
      backgroundColor: colors.surfaceAlt,
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
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border
    },
    toggleRow: {
      flexDirection: "row",
      gap: 12
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border
    },
    toggleButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
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
      color: "#fff"
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
      backgroundColor: colors.accent,
      alignItems: "center"
    },
    startButtonText: {
      color: "#fff",
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
      backgroundColor: colors.surfaceAlt,
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
