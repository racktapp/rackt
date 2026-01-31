import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";

type SportKey = "tennis" | "padel" | "badminton";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

const SPORTS: { key: SportKey; label: string }[] = [
  { key: "tennis", label: "Tennis" },
  { key: "padel", label: "Padel" },
  { key: "badminton", label: "Badminton" }
];

const formatProfileName = (profile: Profile) =>
  profile.full_name?.trim() || profile.username?.trim() || "Unknown player";

export default function CreateLeaderboardScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportKey | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadFriends = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        router.replace("/(auth)/sign-in");
        return;
      }

      setUser(data.user);

      const { data: friendRows, error: friendsError } = await supabase
        .from("friends")
        .select("user_a, user_b")
        .or(`user_a.eq.${data.user.id},user_b.eq.${data.user.id}`);

      if (friendsError) {
        Alert.alert("Friends error", friendsError.message);
        setFriends([]);
        setIsLoading(false);
        return;
      }

      const otherUserIds = Array.from(
        new Set(
          (friendRows ?? []).map((row) =>
            row.user_a === data.user.id ? row.user_b : row.user_a
          )
        )
      );

      if (otherUserIds.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", otherUserIds)
        .order("username", { ascending: true });

      if (profilesError) {
        Alert.alert("Friends error", profilesError.message);
        setFriends([]);
        setIsLoading(false);
        return;
      }

      setFriends(profiles ?? []);
      setIsLoading(false);
    };

    loadFriends();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Missing name", "Enter a leaderboard name.");
      return;
    }

    if (!sport) {
      Alert.alert("Missing sport", "Choose a sport to continue.");
      return;
    }

    setIsSubmitting(true);

    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("leaderboards")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        sport
      })
      .select("id")
      .single();

    if (leaderboardError || !leaderboard) {
      Alert.alert("Create failed", leaderboardError?.message ?? "Unknown error");
      setIsSubmitting(false);
      return;
    }

    const memberIds = Array.from(new Set([user.id, ...selectedFriendIds]));

    const { error: memberError } = await supabase
      .from("leaderboard_members")
      .insert(
        memberIds.map((id) => ({
          leaderboard_id: leaderboard.id,
          user_id: id
        }))
      );

    if (memberError) {
      Alert.alert("Members error", memberError.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace(`/leaderboards/${leaderboard.id}`);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Create leaderboard</Text>
            <Text style={styles.subtitle}>
              Share private rankings with friends.
            </Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput
            placeholder="Leaderboard name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sport</Text>
          <View style={styles.rowWrap}>
            {SPORTS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.choiceButton,
                  sport === option.key && styles.choiceButtonActive
                ]}
                onPress={() => setSport(option.key)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.choiceButtonText,
                    sport === option.key && styles.choiceButtonTextActive
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <Text style={styles.helperText}>Add friends to build a leaderboard.</Text>
          ) : (
            <View style={styles.list}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.listRow}
                  onPress={() => toggleFriend(friend.id)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.listLabel}>{formatProfileName(friend)}</Text>
                  <Text style={styles.listValue}>
                    {selectedFriendIds.includes(friend.id) ? "Added" : "Add"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? "Creating..." : "Create leaderboard"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg
    },
    container: {
      padding: 24,
      paddingBottom: 120,
      gap: 20
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      color: colors.muted,
      marginTop: 4,
      maxWidth: 240
    },
    backButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border
    },
    backButtonText: {
      color: colors.text,
      fontWeight: "600"
    },
    section: {
      gap: 12
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      backgroundColor: colors.card
    },
    rowWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    choiceButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    choiceButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    choiceButtonText: {
      color: colors.text,
      fontWeight: "600"
    },
    choiceButtonTextActive: {
      color: "#0B1220"
    },
    loadingState: {
      padding: 16,
      gap: 10,
      alignItems: "center"
    },
    loadingText: {
      color: colors.muted
    },
    helperText: {
      color: colors.muted,
      lineHeight: 20
    },
    list: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    listRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    listLabel: {
      color: colors.text,
      fontSize: 14
    },
    listValue: {
      color: colors.muted,
      fontSize: 13
    },
    primaryButton: {
      marginTop: 4,
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 16
    },
    primaryButtonDisabled: {
      opacity: 0.7
    },
    primaryButtonText: {
      color: "#0B1220",
      fontWeight: "700",
      fontSize: 15
    }
  });
