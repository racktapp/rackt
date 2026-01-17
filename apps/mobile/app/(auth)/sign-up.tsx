import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage("Check your email to confirm your account.");
    }

    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Use your email and a strong password.</Text>

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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.buttonRow}>
          {isSubmitting ? (
            <ActivityIndicator />
          ) : (
            <Button title="Create account" onPress={handleSignUp} />
          )}
        </View>
      </View>

      <Link href="/(auth)/sign-in" style={styles.link}>
        Already have an account? Sign in.
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
  error: {
    color: "#b00020"
  },
  message: {
    color: "#2563eb"
  },
  link: {
    color: "#2563eb"
  }
});
