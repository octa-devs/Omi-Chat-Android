import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/app-providers";
import { IncomingCallOverlay } from "@/components/call/IncomingCallOverlay";
import { useTheme } from "@/providers/theme-provider";

function RootContent() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen
          name="call/[id]"
          options={{
            presentation: "fullScreenModal",
            animation: "fade",
          }}
        />
      </Stack>
      <IncomingCallOverlay />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootContent />
    </AppProviders>
  );
}
