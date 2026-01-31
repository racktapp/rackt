import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";
import AppButton from "../../src/components/AppButton";
import { useSettings } from "../../src/components/SettingsProvider";

export default function ResetPasswordScreen() {
  const { colors } = useSettings();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = createStyles(colors);

  const handleReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert("Reset failed", "Email is required.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

    if (error) {
      Alert.alert("Reset failed", error.message);
      setIsSubmitting(false);
      return;
    }

    Alert.alert("Email sent", "Check your email for the reset link.");
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        Enter your email to receive a password reset link.
      </Text>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
        />
        <View style={styles.buttonRow}>
          <AppButton
            label={isSubmitting ? "Sending..." : "Send reset email"}
            onPress={handleReset}
            disabled={isSubmitting}
          />
        </View>
      </View>

      <Link href="/(auth)/sign-in" style={styles.link}>
        Back to sign in
      </Link>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      gap: 16,
      backgroundColor: colors.bg
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted
    },
    form: {
      gap: 12
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.card,
      color: colors.text
    },
    buttonRow: {
      marginTop: 8
    },
    link: {
      color: colors.primary
    }
  });
