import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSettings } from "../src/components/SettingsProvider";

export default function NotFoundScreen() {
  const { colors } = useSettings();
  const styles = createStyles(colors);

  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          Go to home screen
        </Link>
      </View>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
      backgroundColor: colors.bg
    },
    title: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text
    },
    link: {
      color: colors.primary
    }
  });
