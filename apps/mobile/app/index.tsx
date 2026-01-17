import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (session: Session | null) => {
      if (!isMounted) {
        return;
      }

      if (session) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        const username = data?.username?.trim() ?? "";

        if (error || !username) {
          router.replace("/(onboarding)/create-profile");
          return;
        }

        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/sign-in");
      }
    };

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      await handleSession(data.session ?? null);
      if (isMounted) {
        setIsChecking(false);
      }
    };

    checkSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Checking session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  text: {
    marginTop: 12
  }
});
