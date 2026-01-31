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

export default function SignUpScreen() {
  const { colors } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = createStyles(colors);

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert("Sign up failed", "Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password
    });

    if (error) {
      Alert.alert("Sign up failed", error.message);
      setIsSubmitting(false);
      return;
    }

    const needsConfirmation = !data.user || !data.user.confirmed_at;

    if (needsConfirmation) {
      Alert.alert(
        "Check your email",
        "Confirm your email then sign in."
      );
    } else {
      router.replace("/(tabs)");
    }

    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

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
            label={isSubmitting ? "Creating..." : "Create account"}
            onPress={handleSignUp}
            disabled={isSubmitting}
          />
        </View>
      </View>

      <Link href="/sign-in" style={styles.link}>
        Already have an account? Sign in.
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
