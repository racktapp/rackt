import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SettingsDrawer from "../../src/components/SettingsDrawer";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";

export default function FriendsScreen() {
  const { colors } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Friends</Text>
            <Text style={styles.subtitle}>Stay in sync with your crew.</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsOpen(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Friends</Text>
          <Text style={styles.cardBody}>
            Coming soon: add friends, share match results, and follow live
            matches.
          </Text>
          <TouchableOpacity style={styles.cardButton}>
            <Text style={styles.cardButtonText}>Invite a friend</Text>
          </TouchableOpacity>
        </View>
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
    screen: {
      flex: 1,
      backgroundColor: colors.bg
    },
    container: {
      flex: 1,
      padding: 24,
      gap: 20
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted,
      marginTop: 4,
      maxWidth: 240
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    settingsIcon: {
      fontSize: 16
    },
    card: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700"
    },
    cardBody: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    },
    cardButton: {
      marginTop: 16,
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999
    },
    cardButtonText: {
      color: "#0B1220",
      fontWeight: "700",
      fontSize: 14
    }
  });
