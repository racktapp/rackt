import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function SettingsScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Sign out failed", error.message);
      setIsSigningOut(false);
      return;
    }
    router.replace("/(auth)/sign-in");
    setIsSigningOut(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Manage your account preferences and authentication status.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isSigningOut ? (
          <ActivityIndicator />
        ) : (
          <Button title="Sign out" onPress={handleSignOut} />
        )}
      </View>
    </View>
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
    color: "#4b5563"
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827"
  }
});
