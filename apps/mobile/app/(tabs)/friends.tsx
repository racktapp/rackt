import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";

type Mode = "friends" | "requests" | "search";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type FriendRequestRow = {
  id: string;
  from_user: string;
};

type RequestItem = {
  id: string;
  fromUserId: string;
  username: string;
  fullName: string;
};

const MODES: { label: string; value: Mode }[] = [
  { label: "Friends", value: "friends" },
  { label: "Requests", value: "requests" },
  { label: "Search", value: "search" }
];

const normalizeProfile = (profile: Profile) => {
  const username = profile.username?.trim() || "unknown";
  const fullName = profile.full_name?.trim() || "";
  return {
    username,
    fullName
  };
};

const orderedPair = (first: string, second: string) => {
  return first < second
    ? { user_a: first, user_b: second }
    : { user_a: second, user_b: first };
};

export default function FriendsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>("friends");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

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
      setIsInitializing(false);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (mode === "friends") {
      loadFriends(user);
      return;
    }

    if (mode === "requests") {
      loadRequests(user);
    }
  }, [mode, user]);

  const loadFriends = async (activeUser: User) => {
    setIsLoading(true);

    const { data: friendRows, error } = await supabase
      .from("friends")
      .select("user_a, user_b")
      .or(`user_a.eq.${activeUser.id},user_b.eq.${activeUser.id}`);

    if (error) {
      Alert.alert("Friends error", error.message);
      setIsLoading(false);
      return;
    }

    const otherUserIds = Array.from(
      new Set(
        (friendRows ?? []).map((row) =>
          row.user_a === activeUser.id ? row.user_b : row.user_a
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
      setIsLoading(false);
      return;
    }

    setFriends(profiles ?? []);
    setIsLoading(false);
  };

  const loadRequests = async (activeUser: User) => {
    setIsLoading(true);

    const { data: requestRows, error } = await supabase
      .from("friend_requests")
      .select("id, from_user")
      .eq("to_user", activeUser.id)
      .eq("status", "pending")
      .order("id", { ascending: false });

    if (error) {
      Alert.alert("Requests error", error.message);
      setIsLoading(false);
      return;
    }

    const senderIds = Array.from(
      new Set((requestRows ?? []).map((row) => row.from_user))
    );

    if (senderIds.length === 0) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", senderIds);

    if (profilesError) {
      Alert.alert("Requests error", profilesError.message);
      setIsLoading(false);
      return;
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile])
    );

    const formattedRequests = (requestRows ?? []).map((request) => {
      const profile = profileMap.get(request.from_user);
      const { username, fullName } = normalizeProfile(
        profile ?? { id: request.from_user, username: null, full_name: null }
      );

      return {
        id: request.id,
        fromUserId: request.from_user,
        username,
        fullName
      };
    });

    setRequests(formattedRequests);
    setIsLoading(false);
  };

  const refreshActiveMode = async () => {
    if (!user) {
      return;
    }

    if (mode === "friends") {
      await loadFriends(user);
      return;
    }

    if (mode === "requests") {
      await loadRequests(user);
      return;
    }

    if (mode === "search") {
      await handleSearch();
    }
  };

  const handleSearch = async () => {
    if (!user) {
      return;
    }

    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .ilike("username", `%${trimmedQuery}%`)
      .neq("id", user.id)
      .limit(20)
      .order("username", { ascending: true });

    if (error) {
      Alert.alert("Search error", error.message);
      setIsLoading(false);
      return;
    }

    setSearchResults(data ?? []);
    setIsLoading(false);
  };

  const handleSendRequest = async (targetId: string) => {
    if (!user) {
      return;
    }

    const { error } = await supabase.from("friend_requests").insert({
      from_user: user.id,
      to_user: targetId
    });

    if (error) {
      const message = error.message.toLowerCase().includes("duplicate")
        ? "Request already sent."
        : error.message;
      Alert.alert("Request failed", message);
      return;
    }

    Alert.alert("Request sent", "Your friend request has been sent.");
  };

  const handleAccept = async (request: RequestItem) => {
    if (!user) {
      return;
    }

    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", request.id);

    if (updateError) {
      Alert.alert("Request error", updateError.message);
      return;
    }

    const pair = orderedPair(user.id, request.fromUserId);

    const { error: insertError } = await supabase.from("friends").insert(pair);

    if (insertError) {
      Alert.alert("Friendship error", insertError.message);
      return;
    }

    await loadRequests(user);
  };

  const handleDecline = async (request: RequestItem) => {
    if (!user) {
      return;
    }

    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "declined" })
      .eq("id", request.id);

    if (error) {
      Alert.alert("Request error", error.message);
      return;
    }

    await loadRequests(user);
  };

  const friendsContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      );
    }

    if (friends.length === 0) {
      return <Text style={styles.emptyText}>No friends yet.</Text>;
    }

    return friends.map((friend) => {
      const { username, fullName } = normalizeProfile(friend);
      return (
        <View key={friend.id} style={styles.card}>
          <Text style={styles.cardTitle}>@{username}</Text>
          {fullName ? <Text style={styles.cardSubtitle}>{fullName}</Text> : null}
        </View>
      );
    });
  }, [friends, isLoading]);

  const requestsContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      );
    }

    if (requests.length === 0) {
      return <Text style={styles.emptyText}>No incoming requests.</Text>;
    }

    return requests.map((request) => (
      <View key={request.id} style={styles.card}>
        <Text style={styles.cardTitle}>@{request.username}</Text>
        {request.fullName ? (
          <Text style={styles.cardSubtitle}>{request.fullName}</Text>
        ) : null}
        <View style={styles.buttonRow}>
          <Button title="Accept" onPress={() => handleAccept(request)} />
          <Button title="Decline" onPress={() => handleDecline(request)} />
        </View>
      </View>
    ));
  }, [requests, isLoading]);

  const searchContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <Text style={styles.emptyText}>Search for a username to add.</Text>
      );
    }

    return searchResults.map((result) => {
      const { username, fullName } = normalizeProfile(result);
      return (
        <View key={result.id} style={styles.card}>
          <Text style={styles.cardTitle}>@{username}</Text>
          {fullName ? <Text style={styles.cardSubtitle}>{fullName}</Text> : null}
          <View style={styles.buttonRow}>
            <Button title="Add" onPress={() => handleSendRequest(result.id)} />
          </View>
        </View>
      );
    });
  }, [searchResults, isLoading]);

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Friends</Text>

        <View style={styles.modeRow}>
          {MODES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setMode(item.value)}
              style={[
                styles.modeButton,
                mode === item.value && styles.modeButtonActive
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === item.value && styles.modeButtonTextActive
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.refreshRow}>
          <Button title="Refresh" onPress={refreshActiveMode} />
        </View>

        {mode === "search" ? (
          <View style={styles.searchCard}>
            <Text style={styles.sectionTitle}>Search by username</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Enter username"
              autoCapitalize="none"
              style={styles.input}
            />
            <Button title="Search" onPress={handleSearch} />
          </View>
        ) : null}

        <View style={styles.section}>
          {mode === "friends" && friendsContent}
          {mode === "requests" && requestsContent}
          {mode === "search" && searchContent}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  content: {
    padding: 24,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  modeRow: {
    flexDirection: "row",
    gap: 12
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center"
  },
  modeButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827"
  },
  modeButtonText: {
    color: "#111827",
    fontWeight: "600"
  },
  modeButtonTextActive: {
    color: "#fff"
  },
  refreshRow: {
    alignItems: "flex-start"
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  searchCard: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb"
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff"
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    gap: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827"
  },
  cardSubtitle: {
    color: "#6b7280"
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12
  },
  emptyText: {
    color: "#6b7280"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12
  },
  loadingText: {
    color: "#6b7280"
  }
});
