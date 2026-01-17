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
    }
    setIsSigningOut(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Manage your account preferences and authentication status.
      </Text>
      {isSigningOut ? (
        <ActivityIndicator />
      ) : (
        <Button title="Log out" onPress={handleSignOut} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12
  },
  title: {
    fontSize: 24,
    fontWeight: "700"
  },
  subtitle: {
    textAlign: "center",
    color: "#666"
  }
});
