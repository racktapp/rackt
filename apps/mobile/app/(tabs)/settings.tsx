import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";
import AppButton from "../../src/components/AppButton";
import { useSettings } from "../../src/components/SettingsProvider";

export default function SettingsScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { settings, colors, updateSettings } = useSettings();
  const styles = createStyles(colors);

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
          <AppButton
            label="Sign out"
            onPress={handleSignOut}
            disabled={isDeletingAccount}
            variant="secondary"
          />
        )}
        {isDeletingAccount ? (
          <ActivityIndicator />
        ) : (
          <AppButton
            label="Delete account"
            onPress={handleDeleteAccount}
            disabled={isSigningOut}
            variant="danger"
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
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
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
    section: {
      gap: 12
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text
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
      color: colors.text
    },
    toggleHint: {
      fontSize: 12,
      color: colors.muted
    }
  });
