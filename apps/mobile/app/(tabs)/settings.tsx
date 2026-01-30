import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";
import { useSettings } from "../../src/components/SettingsProvider";

export default function SettingsScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { settings, colors, updateSettings } = useSettings();

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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            const { error } = await supabase.rpc("delete_user_account");
            if (error) {
              Alert.alert("Delete failed", error.message);
              setIsDeletingAccount(false);
              return;
            }

            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) {
              Alert.alert("Sign out failed", signOutError.message);
            }
            router.replace("/(auth)/sign-in");
            setIsDeletingAccount(false);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Manage your account preferences and authentication status.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isSigningOut ? (
          <ActivityIndicator />
        ) : (
          <Button
            title="Sign out"
            onPress={handleSignOut}
            disabled={isDeletingAccount}
          />
        )}
        {isDeletingAccount ? (
          <ActivityIndicator />
        ) : (
          <Button
            title="Delete account"
            onPress={handleDeleteAccount}
            color="#dc2626"
            disabled={isSigningOut}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Push notifications</Text>
            <Text style={styles.toggleHint}>
              Friend requests and match confirmations
            </Text>
          </View>
          <Switch
            value={settings.pushNotifications}
            onValueChange={(value) =>
              updateSettings({ pushNotifications: value })
            }
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>
      </View>
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
    color: "#4b5563"
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827"
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },
  toggleHint: {
    fontSize: 12,
    color: "#6b7280"
  }
});
