import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
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

type SportRating = {
  sport: string;
  level: string | number | null;
  reliability: number | null;
};

export default function ProfileScreen() {
  const { colors } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [ratings, setRatings] = useState<SportRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayUsername = useMemo(() => {
    if (!username.trim()) {
      return "your_username";
    }
    return username.trim();
  }, [username]);

  const displayFullName = useMemo(() => {
    if (!fullName.trim()) {
      return "Your name";
    }
    return fullName.trim();
  }, [fullName]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        router.replace("/(auth)/sign-in");
        return;
      }

      setUser(data.user);

      const [profileResponse, ratingsResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", data.user.id)
          .maybeSingle(),
        supabase
          .from("sport_ratings")
          .select("sport, level, reliability")
          .eq("user_id", data.user.id)
          .order("sport")
      ]);

      if (!isMounted) {
        return;
      }

      if (profileResponse.error) {
        Alert.alert("Profile error", profileResponse.error.message);
      }

      if (ratingsResponse.error) {
        Alert.alert("Ratings error", ratingsResponse.error.message);
      }

      setUsername(profileResponse.data?.username ?? "");
      setFullName(profileResponse.data?.full_name ?? "");
      setRatings(ratingsResponse.data ?? []);
      setIsLoading(false);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
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

    setIsSaving(true);

    const { data: existingProfile, error: existingError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", trimmedUsername)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      Alert.alert("Username check failed", existingError.message);
      setIsSaving(false);
      return;
    }

    if (existingProfile && existingProfile.id !== user.id) {
      Alert.alert("Username taken", "Please choose a different username.");
      setIsSaving(false);
      return;
    }

    const { error: updateError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: trimmedUsername,
        full_name: trimmedFullName ? trimmedFullName : null
      },
      { onConflict: "id" }
    );

    if (updateError) {
      Alert.alert("Profile update failed", updateError.message);
      setIsSaving(false);
      return;
    }

    Alert.alert("Saved", "Your profile has been updated.");
    setIsEditing(false);
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryName}>{displayFullName}</Text>
          <Text style={styles.summaryUsername}>@{displayUsername}</Text>
          <View style={styles.buttonRow}>
            <AppButton
              label={isEditing ? "Editing" : "Edit profile"}
              onPress={() => setIsEditing((prev) => !prev)}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            {isEditing ? (
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={username}
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.value}>{displayUsername}</Text>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            {isEditing ? (
              <TextInput
                autoCapitalize="words"
                onChangeText={setFullName}
                placeholder="Full name (optional)"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={fullName}
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.value}>{displayFullName}</Text>
            )}
          </View>
          {isEditing && (
            <View style={styles.buttonRow}>
              <AppButton
                label={isSaving ? "Saving..." : "Save"}
                onPress={handleSave}
                disabled={isSaving}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          {ratings.length === 0 ? (
            <Text style={styles.emptyText}>No ratings yet.</Text>
          ) : (
            <View style={styles.ratingsGrid}>
              {ratings.map((rating) => (
                <View key={rating.sport} style={styles.ratingCard}>
                  <Text style={styles.ratingSport}>{rating.sport}</Text>
                  <Text style={styles.ratingDetail}>Level: {rating.level}</Text>
                  <Text style={styles.ratingDetail}>
                    Reliability: {rating.reliability ?? "N/A"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    content: {
      padding: 24,
      gap: 20
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: colors.bg
    },
    loadingText: {
      color: colors.muted
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    summaryCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardAlt,
      gap: 8
    },
    summaryName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text
    },
    summaryUsername: {
      color: colors.muted
    },
    section: {
      gap: 12
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text
    },
    field: {
      gap: 8
    },
    label: {
      fontSize: 14,
      color: colors.muted
    },
    value: {
      fontSize: 16,
      color: colors.text
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: colors.card,
      color: colors.text
    },
    buttonRow: {
      marginTop: 8,
      alignSelf: "flex-start"
    },
    ratingsGrid: {
      gap: 12
    },
    ratingCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 4,
      backgroundColor: colors.card
    },
    ratingSport: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text
    },
    ratingDetail: {
      color: colors.muted
    },
    emptyText: {
      color: colors.muted
    }
  });
