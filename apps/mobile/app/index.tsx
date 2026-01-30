import { useMemo, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { initialState } from "../src/lib/tennis/engine";
import { Player } from "../src/lib/tennis/types";
import {
  MatchConfig,
  saveMatch
} from "../src/lib/storage/matchStorage";
import SettingsDrawer from "../src/components/SettingsDrawer";
import { ThemeColors, useSettings } from "../src/components/SettingsProvider";

export default function SetupMatch() {
  const router = useRouter();
  const { colors } = useSettings();
  const [playerAName, setPlayerAName] = useState("Player A");
  const [playerBName, setPlayerBName] = useState("Player B");
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const [tiebreakAt6All, setTiebreakAt6All] = useState(true);
  const [startingServer, setStartingServer] = useState<Player>("A");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleStartMatch = () => {
    const config: MatchConfig = {
      playerAName: playerAName.trim() || "Player A",
      playerBName: playerBName.trim() || "Player B",
      bestOf,
      tiebreakAt6All,
      startingServer,
      startTime: Date.now()
    };
    const tennisState = initialState({
      bestOf: config.bestOf,
      tiebreakAt6All: config.tiebreakAt6All,
      startingServer: config.startingServer
    });
    saveMatch({ config, tennisState, history: [], timeline: [] });
    router.push("/match");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Match Setup</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setSettingsOpen(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

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
              bestOf === 3 && styles.toggleButtonActive
            ]}
            onPress={() => setBestOf(3)}
          >
            <Text
              style={[
                styles.toggleText,
                bestOf === 3 && styles.toggleTextActive
              ]}
            >
              Best of 3
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              bestOf === 5 && styles.toggleButtonActive
            ]}
            onPress={() => setBestOf(5)}
          >
            <Text
              style={[
                styles.toggleText,
                bestOf === 5 && styles.toggleTextActive
              ]}
            >
              Best of 5
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Tie-break at 6–6</Text>
          <Switch
            value={tiebreakAt6All}
            onValueChange={setTiebreakAt6All}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>
      </View>

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

      <SettingsDrawer
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
      backgroundColor: colors.background
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
    toggleText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600"
    },
    toggleTextActive: {
      color: "#fff"
    },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
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
    }
  });
