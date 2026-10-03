import React from "react";
import { AuthProvider } from "./auth-provider";
import { SettingsProvider } from "./settings-provider";
import { CallProvider } from "./call-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CallProvider>
          {children}
        </CallProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
