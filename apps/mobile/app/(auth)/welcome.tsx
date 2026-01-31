import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import AppButton from "../../src/components/AppButton";
import { ThemeColors, useSettings } from "../../src/components/SettingsProvider";
import { supabase } from "../../lib/supabase";

const svgDataUri = (primary: string, accent: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="2400" viewBox="0 0 1200 2400">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="2400" fill="url(#bg)" />
      <circle cx="220" cy="360" r="200" fill="rgba(255,255,255,0.08)" />
      <circle cx="980" cy="820" r="260" fill="rgba(255,255,255,0.05)" />
      <circle cx="420" cy="1680" r="320" fill="rgba(255,255,255,0.06)" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const SLIDES = [
  {
    title: "Welcome to Rackt",
    body: "The social hub for racket sports. Challenge friends, track matches, and climb the ranks.",
    image: svgDataUri("#102231", "#0C151E")
  },
  {
    title: "Play with friends",
    body: "Add friends, create private leaderboards, and keep rivalries alive with real match results.",
    image: svgDataUri("#123024", "#0A1914")
  },
  {
    title: "Track matches fast",
    body: "Start a match in seconds. Singles or doubles. Tennis, padel, or badminton.",
    image: svgDataUri("#152B40", "#0B141F")
  },
  {
    title: "Improve your rating",
    body: "Confirm results, build reliability, and see progress over time. Like Strava — for racket sports.",
    image: svgDataUri("#1A2433", "#0C121B")
  }
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors } = useSettings();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom, width, height),
    [colors, insets.bottom, width, height]
  );
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      if (data.user) {
        router.replace("/(tabs)");
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

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x ?? 0;
      const nextIndex = Math.round(offsetX / width);
      setActiveIndex(nextIndex);
    },
    [width]
  );

  const handleDotPress = useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
    },
    [width]
  );

  const handleGetStarted = useCallback(() => {
    router.push("/(auth)/sign-up");
  }, [router]);

  const handleLogIn = useCallback(() => {
    router.push("/(auth)/sign-in");
  }, [router]);

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <ImageBackground
            key={slide.title}
            source={{ uri: slide.image }}
            style={styles.slide}
            imageStyle={styles.slideImage}
          >
            <LinearGradient
              colors={["rgba(0, 0, 0, 0.15)", colors.overlay]}
              style={styles.gradient}
            />
          </ImageBackground>
        ))}
      </ScrollView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Rackt</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{SLIDES[activeIndex]?.title}</Text>
          <Text style={styles.body}>{SLIDES[activeIndex]?.body}</Text>
        </View>

        <View style={styles.bottomArea}>
          <View style={styles.dotsRow}>
            {SLIDES.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <TouchableOpacity
                  key={slide.title}
                  onPress={() => handleDotPress(index)}
                  accessibilityRole="button"
                  style={[styles.dot, isActive && styles.dotActive]}
                />
              );
            })}
          </View>

          <View style={styles.buttonStack}>
            <AppButton label="Get Started" onPress={handleGetStarted} />
            <AppButton label="Log In" onPress={handleLogIn} variant="secondary" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (
  colors: ThemeColors,
  bottomInset: number,
  width: number,
  height: number
) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg
    },
    slide: {
      width,
      height
    },
    slideImage: {
      resizeMode: "cover"
    },
    gradient: {
      ...StyleSheet.absoluteFillObject
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingBottom: Math.max(bottomInset, 16)
    },
    logoRow: {
      alignItems: "flex-start",
      paddingTop: 12
    },
    logoText: {
      color: "#F5F7FA",
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: 1.2
    },
    textBlock: {
      marginTop: 80,
      maxWidth: 320,
      gap: 12
    },
    title: {
      fontSize: 34,
      fontWeight: "800",
      color: "#F5F7FA",
      lineHeight: 40
    },
    body: {
      fontSize: 16,
      color: "rgba(245, 247, 250, 0.85)",
      lineHeight: 22
    },
    bottomArea: {
      gap: 18
    },
    dotsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(245, 247, 250, 0.4)"
    },
    dotActive: {
      width: 20,
      backgroundColor: colors.primary
    },
    buttonStack: {
      gap: 12
    }
  });
