import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { ThemeColors, useSettings } from "../src/components/SettingsProvider";

export default function IndexScreen() {
  const router = useRouter();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      if (data.user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/welcome");
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }
        if (session?.user) {
          router.replace("/(tabs)");
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg
    }
  });
