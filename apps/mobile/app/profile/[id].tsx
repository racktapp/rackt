import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type SportRating = {
  sport: string;
  level: string | number | null;
  reliability: number | null;
};

const formatDisplayName = (profile?: ProfileRow) => {
  if (!profile) {
    return "Player";
  }
  return profile.full_name?.trim() || profile.username?.trim() || "Player";
};

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors } = useSettings();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ratings, setRatings] = useState<SportRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError || !userData.user) {
        router.replace("/(auth)/sign-in");
        return;
      }

      const user: User = userData.user;

      if (!id || typeof id !== "string") {
        setErrorMessage("Profile not found.");
        setIsLoading(false);
        return;
      }

      if (id === user.id) {
        router.replace("/(app)/profile");
        return;
      }

      const [profileResponse, ratingsResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("sport_ratings")
          .select("sport, level, reliability")
          .eq("user_id", id)
          .order("sport")
      ]);

      if (!isMounted) {
        return;
      }

      if (profileResponse.error) {
        setErrorMessage(profileResponse.error.message);
        setIsLoading(false);
        return;
      }

      if (!profileResponse.data) {
        setErrorMessage("Profile not found.");
        setIsLoading(false);
        return;
      }

      if (ratingsResponse.error) {
        setErrorMessage(ratingsResponse.error.message);
        setIsLoading(false);
        return;
      }

      setProfile(profileResponse.data);
      setRatings(ratingsResponse.data ?? []);
      setIsLoading(false);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load profile</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = formatDisplayName(profile ?? undefined);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.subtitle}>
          @{profile?.username?.trim() || "player"}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          {ratings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No ratings yet.</Text>
            </View>
          ) : (
            ratings.map((rating) => (
              <View key={rating.sport} style={styles.ratingCard}>
                <Text style={styles.ratingSport}>{rating.sport}</Text>
                <Text style={styles.ratingLevel}>Level {rating.level ?? "-"}</Text>
                <Text style={styles.ratingMeta}>
                  Reliability {rating.reliability ?? "-"}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg
    },
    loadingText: {
      marginTop: 12,
      color: colors.muted
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg
    },
    content: {
      padding: 24,
      paddingBottom: 120,
      gap: 16
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14
    },
    section: {
      gap: 12
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text
    },
    ratingCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 6
    },
    ratingSport: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text
    },
    ratingLevel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600"
    },
    ratingMeta: {
      color: colors.muted,
      fontSize: 12
    },
    emptyCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13
    },
    errorCard: {
      margin: 24,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 8
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text
    },
    errorBody: {
      color: colors.muted,
      fontSize: 13
    }
  });
