import { useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle
} from "react-native";

import { ThemeColors, useSettings } from "./SettingsProvider";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export default function AppButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  style
}: AppButtonProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        stylesByVariant(styles)[variant],
        pressed && !disabled && stylesByVariant(styles)[`${variant}Pressed`],
        disabled && styles.disabled,
        style
      ]}
    >
      <Text style={[styles.label, labelColorForVariant(colors, variant)]}>
        {label}
      </Text>
    </Pressable>
  );
}

const labelColorForVariant = (colors: ThemeColors, variant: ButtonVariant) => {
  switch (variant) {
    case "primary":
      return { color: "#0B1220" };
    case "danger":
      return { color: "#0B1220" };
    case "ghost":
      return { color: colors.primary };
    case "secondary":
    default:
      return { color: colors.text };
  }
};

const stylesByVariant = (styles: ReturnType<typeof createStyles>) => ({
  primary: styles.primary,
  primaryPressed: styles.primaryPressed,
  secondary: styles.secondary,
  secondaryPressed: styles.secondaryPressed,
  ghost: styles.ghost,
  ghostPressed: styles.ghostPressed,
  danger: styles.danger,
  dangerPressed: styles.dangerPressed
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48
    },
    label: {
      fontSize: 15,
      fontWeight: "700"
    },
    disabled: {
      opacity: 0.6
    },
    primary: {
      backgroundColor: colors.primary
    },
    primaryPressed: {
      backgroundColor: colors.primaryPressed
    },
    secondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border
    },
    secondaryPressed: {
      backgroundColor: colors.cardAlt
    },
    ghost: {
      backgroundColor: "transparent"
    },
    ghostPressed: {
      backgroundColor: colors.cardAlt
    },
    danger: {
      backgroundColor: colors.danger
    },
    dangerPressed: {
      backgroundColor: "#DC2626"
    }
  });
