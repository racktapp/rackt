import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSettings } from "../../src/components/SettingsProvider";

const MAX_LOG_ENTRIES = 200;
const RECENT_WINDOW_MS = 10_000;

type LogEntry = {
  id: string;
  timestamp: string;
  type: "keyPress" | "textChange";
  detail: string;
};

const formatTimestamp = (date: Date) =>
  date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

export default function InputConsoleScreen() {
  const { colors } = useSettings();
  const styles = createStyles(colors);
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastInputAt, setLastInputAt] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
    return () => clearTimeout(focusTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const appendLog = useCallback((entry: LogEntry) => {
    setLog((prev) => {
      const next = [entry, ...prev];
      return next.slice(0, MAX_LOG_ENTRIES);
    });
  }, []);

  const handleInputEvent = useCallback(
    (type: LogEntry["type"], detail: string) => {
      const timestamp = formatTimestamp(new Date());
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp,
        type,
        detail
      };
      appendLog(entry);
      setLastInputAt(Date.now());
    },
    [appendLog]
  );

  const handleKeyPress = useCallback(
    (event: { nativeEvent: { key: string } }) => {
      const key = event.nativeEvent.key;
      handleInputEvent("keyPress", key ?? "(unknown)");
    },
    [handleInputEvent]
  );

  const handleChangeText = useCallback(
    (text: string) => {
      setInputValue("");
      if (!text) {
        return;
      }
      handleInputEvent("textChange", `"${text}" (len ${text.length})`);
    },
    [handleInputEvent]
  );

  const lastEntry = log[0];
  const isRecentlyConnected =
    lastInputAt !== null && now - lastInputAt < RECENT_WINDOW_MS;

  const logLines = useMemo(
    () =>
      log.map(
        (entry) =>
          `${entry.timestamp} ${entry.type}: ${entry.detail}`
      ),
    [log]
  );

  const handleClearLog = () => {
    setLog([]);
    setLastInputAt(null);
  };

  const handleCopyLog = async () => {
    const lines = logLines.slice(0, 50).join("\n");
    const summary = [
      `Input Console (${Platform.OS})`,
      `Last input: ${lastEntry ? `${lastEntry.timestamp} ${lastEntry.type}` : "none"}`,
      `Detected recently: ${isRecentlyConnected ? "yes" : "no"}`,
      "",
      lines
    ].join("\n");
    await Clipboard.setStringAsync(summary);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Input Console</Text>
        <Text style={styles.subtitle}>
          Debug key-like input events from connected controllers in Expo Go.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <Text style={styles.statusText}>
            {isRecentlyConnected ? "✅ Input detected recently" : "❌ No input detected"}
          </Text>
          <Text style={styles.helperText}>
            Last input: {lastEntry
              ? `${lastEntry.timestamp} ${lastEntry.type}: ${lastEntry.detail}`
              : "No input yet"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Capture Box</Text>
          <Text style={styles.helperText}>
            Tap here if input isn&apos;t detected, then press buttons on the controller.
          </Text>
          <Pressable
            style={[styles.captureBox, isFocused && styles.captureBoxFocused]}
            onPress={() => inputRef.current?.focus()}
          >
            <TextInput
              ref={inputRef}
              style={styles.captureInput}
              value={inputValue}
              onChangeText={handleChangeText}
              onKeyPress={handleKeyPress}
              autoCorrect={false}
              autoCapitalize="none"
              blurOnSubmit={false}
              placeholder="Input will appear in the log below"
              placeholderTextColor={colors.muted}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.logHeader}>
            <Text style={styles.cardTitle}>Event Log (last 200)</Text>
            <View style={styles.logActions}>
              <Pressable style={styles.logButton} onPress={handleClearLog}>
                <Text style={styles.logButtonText}>Clear log</Text>
              </Pressable>
              <Pressable style={styles.logButton} onPress={handleCopyLog}>
                <Text style={styles.logButtonText}>Copy debug info</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.logContainer}>
            {logLines.length === 0 ? (
              <Text style={styles.helperText}>No events yet.</Text>
            ) : (
              logLines.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.logLine}>
                  {line}
                </Text>
              ))
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Important limitations (Expo Go)</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • We cannot read iOS GameController info (name, battery, true connection
              status).
            </Text>
            <Text style={styles.bulletItem}>
              • This console only detects key-like events. Some Xbox controllers may not
              emit these, so “no events” doesn’t always mean “not connected.”
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Troubleshooting</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • Pair the controller in iOS Bluetooth settings first.
            </Text>
            <Text style={styles.bulletItem}>
              • Some Xbox controllers don&apos;t send key events to apps in Expo Go.
            </Text>
            <Text style={styles.bulletItem}>
              • If nothing shows, test with a Bluetooth keyboard to verify the console
              works.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    content: {
      padding: 24,
      gap: 16
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text
    },
    statusText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary
    },
    helperText: {
      color: colors.muted
    },
    captureBox: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardAlt,
      borderRadius: 12,
      padding: 12
    },
    captureBoxFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 }
    },
    captureInput: {
      color: colors.text,
      minHeight: 44
    },
    logHeader: {
      gap: 12
    },
    logActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    logButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.primary
    },
    logButtonText: {
      color: colors.text,
      fontWeight: "600"
    },
    logContainer: {
      gap: 6
    },
    logLine: {
      fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
      fontSize: 12,
      color: colors.text
    },
    bulletList: {
      gap: 8
    },
    bulletItem: {
      color: colors.muted,
      lineHeight: 18
    }
  });
