"use client";

import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth-provider";
import { SettingsProvider } from "./settings-provider";
import { CallProvider } from "./call-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CallProvider>
          {children}
          <Toaster
            position="top-center"
            offset={18}
            gap={10}
            visibleToasts={4}
            toastOptions={{
              classNames: {
                toast:
                  "!rounded-2xl !border !border-fg/10 !bg-white !backdrop-blur-2xl !text-fg !shadow-[0_18px_46px_-20px_rgba(19,23,37,0.3)]",
                title: "!text-fg !font-medium",
                description: "!text-fg-2",
                success: "!border-mint-200",
                error: "!border-rust-200",
              },
            }}
          />
        </CallProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}