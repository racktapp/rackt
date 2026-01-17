import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <View style={styles.buttonRow}>
          <Button
            title={isSubmitting ? "Signing in..." : "Sign in"}
            onPress={handleSignIn}
            disabled={isSubmitting}
          />
        </View>
      </View>

      <Link href="/sign-up" style={styles.link}>
        Don&apos;t have an account? Create one.
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: "#666"
  },
  form: {
    gap: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  buttonRow: {
    marginTop: 8
  },
  link: {
    color: "#2563eb"
  }
});
