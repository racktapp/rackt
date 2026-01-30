import { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { ThemeColors, useSettings } from "./SettingsProvider";

type SettingsDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

const themeOptions = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" }
] as const;

export default function SettingsDrawer({
  visible,
  onClose
}: SettingsDrawerProps) {
  const { settings, colors, updateSettings, resetSettings } = useSettings();

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Theme</Text>
            <View style={styles.optionRow}>
              {themeOptions.map((option) => {
                const isActive = settings.theme === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionPill, isActive && styles.optionPillActive]}
                    onPress={() => updateSettings({ theme: option.value })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isActive && styles.optionTextActive
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.sectionLabel}>Haptics</Text>
                <Text style={styles.sectionHint}>Vibration feedback</Text>
              </View>
              <Switch
                value={settings.haptics}
                onValueChange={(value) => updateSettings({ haptics: value })}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.sectionLabel}>Sounds</Text>
                <Text style={styles.sectionHint}>Subtle scoring cues</Text>
              </View>
              <Switch
                value={settings.sounds}
                onValueChange={(value) => updateSettings({ sounds: value })}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.sectionLabel}>Push notifications</Text>
                <Text style={styles.sectionHint}>
                  Friend requests and match confirmations
                </Text>
              </View>
              <Switch
                value={settings.pushNotifications}
                onValueChange={(value) =>
                  updateSettings({ pushNotifications: value })
                }
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => resetSettings()}
            >
              <Text style={styles.resetButtonText}>Reset to defaults</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end"
    },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay
    },
    sheet: {
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 18
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text
    },
    closeButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt
    },
    closeButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 12
    },
    section: {
      gap: 8
    },
    sectionLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600"
    },
    sectionHint: {
      color: colors.muted,
      fontSize: 12
    },
    optionRow: {
      flexDirection: "row",
      gap: 8
    },
    optionPill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.surfaceAlt
    },
    optionPillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    optionText: {
      fontWeight: "600",
      color: colors.text,
      fontSize: 13
    },
    optionTextActive: {
      color: "#fff"
    },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    footerRow: {
      alignItems: "flex-start"
    },
    resetButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border
    },
    resetButtonText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600"
    }
  });
