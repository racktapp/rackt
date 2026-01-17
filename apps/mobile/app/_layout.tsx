import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setIsLoading(false);
    };

    loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    }

    if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoading, router, segments, session]);

  if (isLoading) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
