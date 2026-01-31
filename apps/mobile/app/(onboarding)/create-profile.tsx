import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import AppButton from "../../src/components/AppButton";
import { useSettings } from "../../src/components/SettingsProvider";

const USERNAME_REGEX = /^[A-Za-z0-9_.]+$/;

export default function CreateProfileScreen() {
  const { colors } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const styles = createStyles(colors);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        router.replace("/(auth)/sign-in");
        return;
      }

      setUser(data.user);
      setIsChecking(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleContinue = async () => {
    if (!user) {
      router.replace("/(auth)/sign-in");
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedUsername) {
      Alert.alert("Invalid username", "Username is required.");
      return;
    }

    if (trimmedUsername.length < 3) {
      Alert.alert("Invalid username", "Username must be at least 3 characters.");
      return;
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      Alert.alert(
        "Invalid username",
        "Username can only include letters, numbers, underscores, and dots."
      );
      return;
    }

    setIsSubmitting(true);

    const { data: existingProfile, error: existingError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", trimmedUsername)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      Alert.alert("Username check failed", existingError.message);
      setIsSubmitting(false);
      return;
    }

    if (existingProfile && existingProfile.id !== user.id) {
      Alert.alert("Username taken", "Please choose a different username.");
      setIsSubmitting(false);
      return;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: trimmedUsername,
        full_name: trimmedFullName ? trimmedFullName : null
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      Alert.alert("Profile update failed", upsertError.message);
      setIsSubmitting(false);
      return;
    }

    router.replace("/(onboarding)/sports-and-levels");
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create your profile</Text>
      <Text style={styles.subtitle}>Choose a username to get started.</Text>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={username}
          editable={!isChecking && !isSubmitting}
        />
        <TextInput
          autoCapitalize="words"
          onChangeText={setFullName}
          placeholder="Full name (optional)"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={fullName}
          editable={!isChecking && !isSubmitting}
        />
        <View style={styles.buttonRow}>
          <AppButton
            label={isSubmitting ? "Saving..." : "Continue"}
            onPress={handleContinue}
            disabled={isSubmitting || isChecking}
          />
        </View>
      </View>
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
    }
  });
