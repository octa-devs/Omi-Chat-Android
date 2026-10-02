"use client";

import { useEffect, useState } from "react";
import { Bell, HardDrive, Mic, ShieldCheck, Check, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PermissionsPromptModal() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notifState, setNotifState] = useState<string>("default");
  const [storageState, setStorageState] = useState<boolean>(false);
  const [mediaState, setMediaState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const notif = typeof Notification !== "undefined" ? Notification.permission : "granted";
    setNotifState(notif);

    if (navigator.storage?.persisted) {
      navigator.storage.persisted().then(setStorageState).catch(() => undefined);
    }

    const alreadyConfigured = localStorage.getItem("omi.permissions_configured");
    // Show prompt if not already dismissed/configured and notifications are not yet granted
    if (!alreadyConfigured && notif === "default") {
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const requestAllPermissions = async () => {
    setBusy(true);
    let notifGranted = false;

    // 1. Notification Permission
    try {
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        const res = await Notification.requestPermission();
        setNotifState(res);
        notifGranted = res === "granted";
      } else {
        notifGranted = true;
      }
    } catch {
      // ignore
    }

    // 2. Storage & Files Permission
    try {
      if (navigator.storage?.persist) {
        const persisted = await navigator.storage.persist();
        setStorageState(persisted);
      }
    } catch {
      // ignore
    }

    // 3. Audio & Calls Media Permission Check
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setMediaState(true);
      }
    } catch {
      // ignore, might not have mic or denied
    }

    localStorage.setItem("omi.permissions_configured", "true");
    setBusy(false);
    setOpen(false);

    if (notifGranted) {
      toast.success("All permissions enabled! You'll now receive notifications and call alerts.");
    } else {
      toast.info("Permissions updated.");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("omi.permissions_configured", "dismissed");
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleDismiss}
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-5 text-brand-600" />
          <span>Enable App Permissions</span>
        </span>
      }
      description="Allow Omi Chat to deliver desktop & mobile notifications, manage file storage, and enable HD voice & video calls."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="ghost" onClick={handleDismiss} disabled={busy}>
            Maybe later
          </Button>
          <Button variant="primary" onClick={requestAllPermissions} loading={busy}>
            Allow All Permissions
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Notifications */}
        <div className="glass flex items-start gap-3.5 rounded-2xl p-4 transition-colors">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/50">
            <Bell className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-fg">Desktop & Mobile Notifications</h4>
              {notifState === "granted" && (
                <span className="flex items-center gap-1 text-xs font-medium text-mint-600">
                  <Check className="size-3.5" /> Granted
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-fg-3">
              Receive live alerts for incoming messages and call rings even when the app is in the background.
            </p>
          </div>
        </div>

        {/* Storage and Files */}
        <div className="glass flex items-start gap-3.5 rounded-2xl p-4 transition-colors">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600 dark:bg-gold-900/50">
            <HardDrive className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-fg">Storage & File Attachments</h4>
              {storageState && (
                <span className="flex items-center gap-1 text-xs font-medium text-mint-600">
                  <Check className="size-3.5" /> Active
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-fg-3">
              Enables persistent offline caching, image pasting from clipboard, and fast photo/document transfers.
            </p>
          </div>
        </div>

        {/* Microphone & Camera */}
        <div className="glass flex items-start gap-3.5 rounded-2xl p-4 transition-colors">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-100 text-mint-600 dark:bg-mint-900/50">
            <Mic className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-fg">Microphone & Video Calls</h4>
              {mediaState && (
                <span className="flex items-center gap-1 text-xs font-medium text-mint-600">
                  <Check className="size-3.5" /> Ready
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-fg-3">
              Required for seamless WebRTC voice notes and two-way video calls without browser permission errors.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
