import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";
import { useSettings } from "../../src/components/SettingsProvider";

type SportKey = "tennis" | "padel" | "badminton" | "table_tennis";

type SportSelection = {
  selected: boolean;
  level: string;
  hasLevel: boolean;
  reliability: string;
};

const SPORTS: { key: SportKey; label: string }[] = [
  { key: "tennis", label: "Tennis" },
  { key: "padel", label: "Padel" },
  { key: "badminton", label: "Badminton" },
  { key: "table_tennis", label: "Table tennis" }
];

const DEFAULT_LEVEL = "3.0";
const DEFAULT_RELIABILITY = "30";

export default function SportsAndLevelsScreen() {
  const { colors } = useSettings();
  const [selections, setSelections] = useState<Record<SportKey, SportSelection>>(
    () =>
      SPORTS.reduce(
        (accumulator, sport) => {
          accumulator[sport.key] = {
            selected: false,
            level: DEFAULT_LEVEL,
            hasLevel: false,
            reliability: DEFAULT_RELIABILITY
          };
          return accumulator;
        },
        {} as Record<SportKey, SportSelection>
      )
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedCount = useMemo(
    () => Object.values(selections).filter((selection) => selection.selected)
      .length,
    [selections]
  );

  const toggleSport = (sportKey: SportKey) => {
    setSelections((current) => ({
      ...current,
      [sportKey]: {
        ...current[sportKey],
        selected: !current[sportKey].selected
      }
    }));
  };

  const updateLevel = (sportKey: SportKey, level: string) => {
    setSelections((current) => ({
      ...current,
      [sportKey]: {
        ...current[sportKey],
        level
      }
    }));
  };

  const updateHasLevel = (sportKey: SportKey, hasLevel: boolean) => {
    setSelections((current) => ({
      ...current,
      [sportKey]: {
        ...current[sportKey],
        hasLevel,
        level: hasLevel ? current[sportKey].level : DEFAULT_LEVEL,
        reliability: hasLevel ? current[sportKey].reliability : DEFAULT_RELIABILITY
      }
    }));
  };

  const updateReliability = (sportKey: SportKey, reliability: string) => {
    setSelections((current) => ({
      ...current,
      [sportKey]: {
        ...current[sportKey],
        reliability
      }
    }));
  };

  const handleFinish = async () => {
    if (selectedCount === 0) {
      Alert.alert("Choose at least one sport", "Select a sport to continue.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setIsSubmitting(false);
      router.replace("/(auth)/sign-in");
      return;
    }

    const userId = data.user.id;

    const payload = SPORTS.filter((sport) => selections[sport.key].selected).map(
      (sport) => {
        const selection = selections[sport.key];
        const hasLevel = selection.hasLevel;
        const reliabilityInput = selection.reliability.trim();
        const level = hasLevel
          ? Number.parseFloat(selection.level)
          : Number.parseFloat(DEFAULT_LEVEL);
        const reliability = hasLevel
          ? Number.parseFloat(
              reliabilityInput ? reliabilityInput : DEFAULT_RELIABILITY
            )
          : 20;

        return {
          user_id: userId,
          sport: sport.key,
          level,
          reliability,
          source: hasLevel ? "user_import" : "system"
        };
      }
    );

    for (const entry of payload) {
      if (Number.isNaN(entry.level) || entry.level < 0 || entry.level > 7) {
        Alert.alert(
          "Invalid level",
          "Levels must be a number between 0.0 and 7.0."
        );
        setIsSubmitting(false);
        return;
      }

      if (
        entry.source === "user_import" &&
        (Number.isNaN(entry.reliability) ||
          entry.reliability < 0 ||
          entry.reliability > 100)
      ) {
        Alert.alert(
          "Invalid reliability",
          "Reliability must be a number between 0 and 100."
        );
        setIsSubmitting(false);
        return;
      }
    }

    const { error: upsertError } = await supabase
      .from("sport_ratings")
      .upsert(payload, { onConflict: "user_id,sport" });

    if (upsertError) {
      Alert.alert("Failed to save ratings", upsertError.message);
      setIsSubmitting(false);
      return;
    }

    router.replace("/(tabs)");
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Choose your sports</Text>
        <Text style={styles.subtitle}>Select the sports you play most.</Text>

        <View style={styles.list}>
          {SPORTS.map((sport) => {
            const selection = selections[sport.key];
            return (
              <View key={sport.key} style={styles.card}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.row}
                  onPress={() => toggleSport(sport.key)}
                >
                  <View style={styles.checkboxOuter}>
                    {selection.selected ? (
                      <View style={styles.checkboxInner} />
                    ) : null}
                  </View>
                  <Text style={styles.rowLabel}>{sport.label}</Text>
                </TouchableOpacity>

                {selection.selected ? (
                  <View style={styles.detailSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Starting level</Text>
                      <TextInput
                        keyboardType="decimal-pad"
                        value={selection.level}
                        onChangeText={(value) => updateLevel(sport.key, value)}
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>I already have a level</Text>
                      <Switch
                        value={selection.hasLevel}
                        onValueChange={(value) =>
                          updateHasLevel(sport.key, value)
                        }
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.card}
                      />
                    </View>
                    {selection.hasLevel ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reliability</Text>
                        <TextInput
                          keyboardType="number-pad"
                          value={selection.reliability}
                          onChangeText={(value) =>
                            updateReliability(sport.key, value)
                          }
                          style={styles.input}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.finishButton,
            isSubmitting ? styles.finishButtonDisabled : null
          ]}
          onPress={handleFinish}
          disabled={isSubmitting}
        >
          <Text style={styles.finishText}>
            {isSubmitting ? "Saving..." : "Finish"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 120
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 8,
      color: colors.text
    },
    subtitle: {
      color: colors.muted,
      marginBottom: 16
    },
    list: {
      gap: 16
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.card,
      gap: 12
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    checkboxOuter: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card
    },
    checkboxInner: {
      width: 12,
      height: 12,
      borderRadius: 3,
      backgroundColor: colors.primary
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text
    },
    detailSection: {
      gap: 12,
      paddingTop: 4
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    detailLabel: {
      fontSize: 14,
      color: colors.muted,
      flex: 1
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: 80,
      textAlign: "center",
      backgroundColor: colors.card,
      color: colors.text
    },
    footer: {
      padding: 24,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    finishButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center"
    },
    finishButtonDisabled: {
      opacity: 0.7
    },
    finishText: {
      color: "#0B1220",
      fontWeight: "600",
      fontSize: 16
    }
  });
