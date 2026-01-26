import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { router } from "expo-router";

import { GamepadEvent, useGamepad } from "../lib/gamepad";

const formatEvent = (event: GamepadEvent) => {
  switch (event.type) {
    case "connect":
      return `Connected: ${event.vendorName} (${event.productCategory})`;
    case "disconnect":
      return `Disconnected: ${event.vendorName} (${event.productCategory})`;
    case "button":
      return `Button ${event.name} ${event.pressed ? "pressed" : "released"} (${event.value.toFixed(
        2
      )})`;
    case "axis":
      return `Axis ${event.name} (${event.x.toFixed(2)}, ${event.y.toFixed(2)})`;
    default:
      return "Event";
  }
};

export default function ControllerSetupScreen() {
  const isAndroid = Platform.OS === "android";
  const { connected, lastEvent, buttonsDown } = useGamepad();
  const [eventLog, setEventLog] = useState<GamepadEvent[]>([]);

  useEffect(() => {
    if (!lastEvent) {
      return;
    }
    setEventLog((prev) => [lastEvent, ...prev].slice(0, 20));
  }, [lastEvent]);

  const status = connected.length > 0 ? "Connected" : "Not connected";
  const controllerLabel = useMemo(() => {
    if (connected.length === 0) {
      return "None";
    }
    const primary = connected[0];
    return `${primary.vendorName} (${primary.productCategory})`;
  }, [connected]);

  const pressedButtons = Object.keys(buttonsDown).filter((key) => buttonsDown[key]);

  if (isAndroid) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Controller Setup</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Android support is coming soon.</Text>
          <Text style={styles.bodyText}>
            This screen is iOS-only for now. Pair a controller on iOS to test live
            input events.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Controller Setup</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connect your controller (iOS only)</Text>
        <Text style={styles.bodyText}>
          1. Open Settings → Bluetooth on your iPhone.
        </Text>
        <Text style={styles.bodyText}>
          2. Hold the pairing button on your Xbox or PlayStation controller until it
          appears.
        </Text>
        <Text style={styles.bodyText}>
          3. Tap the controller name to pair, then return to Rackt.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <Text style={styles.statusText}>{status}</Text>
        <Text style={styles.bodyText}>Controller: {controllerLabel}</Text>
        {pressedButtons.length > 0 ? (
          <Text style={styles.bodyText}>
            Buttons down: {pressedButtons.join(", ")}
          </Text>
        ) : (
          <Text style={styles.bodyText}>Buttons down: None</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live event log</Text>
        {eventLog.length === 0 ? (
          <Text style={styles.bodyText}>
            No events yet. Press buttons or move sticks to see updates.
          </Text>
        ) : (
          <View style={styles.eventList}>
            {eventLog.map((event, index) => (
              <Text key={`${event.type}-${index}`} style={styles.eventItem}>
                {formatEvent(event)}
              </Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  backText: {
    fontSize: 16,
    color: "#111",
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700"
  },
  bodyText: {
    color: "#555",
    lineHeight: 20
  },
  eventList: {
    gap: 8
  },
  eventItem: {
    fontSize: 14,
    color: "#111"
  }
});
