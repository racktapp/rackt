import { Link, router } from "expo-router";
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

export default function SignInScreen() {
  const { colors } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = createStyles(colors);

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert("Sign in failed", "Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password
    });

    if (signInError) {
      Alert.alert("Sign in failed", signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.replace("/(tabs)");
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in with your email and password.</Text>

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
        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <View style={styles.buttonRow}>
          <AppButton
            label={isSubmitting ? "Signing in..." : "Sign in"}
            onPress={handleSignIn}
            disabled={isSubmitting}
          />
        </View>
      </View>

      <Link href="/(auth)/reset-password" style={styles.link}>
        Forgot password?
      </Link>
      <Link href="/sign-up" style={styles.link}>
        Don&apos;t have an account? Create one.
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
