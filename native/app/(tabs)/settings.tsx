import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Moon,
  Sun,
  Smartphone,
  Palette,
  Bell,
  Lock,
  LogOut,
  User,
  Shield,
  Check,
  Edit2,
} from "lucide-react-native";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useSettings } from "@/providers/settings-provider";
import { Avatar } from "@/components/ui/Avatar";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import type { AccentName, ThemePreference } from "@/lib/types";

const ACCENTS: Array<{ id: AccentName; label: string; color: string }> = [
  { id: "azure", label: "Azure", color: "#38bdf8" },
  { id: "slate", label: "Slate", color: "#94a3b8" },
  { id: "teal", label: "Teal", color: "#14b8a6" },
  { id: "amber", label: "Amber", color: "#f59e0b" },
];

export default function SettingsTab() {
  const router = useRouter();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { theme, preference, accent, setPreference, setAccent } = useTheme();
  const { settings, update } = useSettings();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setEditProfileOpen(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setDisplayName(profile?.displayName || "");
            setBio(profile?.bio || "");
            setEditProfileOpen(true);
          }}
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Avatar
            src={profile?.avatarUrl || user?.avatarUrl}
            name={profile?.displayName || user?.displayName || "Me"}
            size={64}
            isOnline={true}
          />
          <View style={styles.profileInfo}>
            <Text
              style={[styles.profileName, { color: theme.colors.foreground }]}
              numberOfLines={1}
            >
              {profile?.displayName || user?.displayName || "Omi User"}
            </Text>
            {profile?.username && (
              <Text
                style={[styles.profileHandle, { color: theme.colors.primary }]}
              >
                @{profile.username}
              </Text>
            )}
            <Text
              style={[styles.profileBio, { color: theme.colors.mutedForeground }]}
              numberOfLines={2}
            >
              {profile?.bio || "No bio yet — tap to edit."}
            </Text>
          </View>
          <Edit2 size={18} color={theme.colors.mutedForeground} />
        </TouchableOpacity>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
          APPEARANCE & THEME
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Theme Selector */}
          <View style={styles.themeSelectorRow}>
            {(
              [
                { id: "system", label: "System", icon: Smartphone },
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
              ] as Array<{ id: ThemePreference; label: string; icon: any }>
            ).map((t) => {
              const isSelected = preference === t.id;
              const IconComp = t.icon;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setPreference(t.id)}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary + "1A"
                        : theme.colors.card,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                >
                  <IconComp
                    size={20}
                    color={
                      isSelected ? theme.colors.primary : theme.colors.mutedForeground
                    }
                  />
                  <Text
                    style={[
                      styles.themeBtnText,
                      {
                        color: isSelected
                          ? theme.colors.primary
                          : theme.colors.foreground,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Accent Color Picker */}
          <View
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
            ]}
          >
            <View style={styles.settingMeta}>
              <Palette size={18} color={theme.colors.foreground} />
              <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>
                Accent Color
              </Text>
            </View>
            <View style={styles.accentPicker}>
              {ACCENTS.map((a) => {
                const isSelected = accent === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setAccent(a.id)}
                    style={[
                      styles.accentCircle,
                      { backgroundColor: a.color },
                      isSelected && styles.accentCircleSelected,
                    ]}
                  >
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Notifications & Sound Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
          PREFERENCES
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingMeta}>
              <Bell size={18} color={theme.colors.foreground} />
              <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>
                Notification Sounds
              </Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(val) => update({ soundEnabled: val })}
            />
          </View>

          <View
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
            ]}
          >
            <View style={styles.settingMeta}>
              <Lock size={18} color={theme.colors.foreground} />
              <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>
                Read Receipts
              </Text>
            </View>
            <Switch
              value={settings.readReceipts}
              onValueChange={(val) => update({ readReceipts: val })}
            />
          </View>
        </View>

        {/* Sign Out Action */}
        <View style={styles.logoutSection}>
          <Button
            title="Log Out"
            variant="danger"
            onPress={handleSignOut}
            icon={<LogOut size={18} color="#ffffff" />}
            fullWidth
          />
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Edit Profile"
      >
        <View style={{ gap: 12 }}>
          <Field
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
          />
          <Field
            label="Bio / Status"
            value={bio}
            onChangeText={setBio}
            placeholder="What's on your mind?"
            multiline
            numberOfLines={3}
          />
          <Button
            title="Save Changes"
            onPress={handleSaveProfile}
            loading={saving}
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  profileInfo: {
    flex: 1,
    marginHorizontal: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
  },
  profileHandle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  profileBio: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  themeSelectorRow: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  themeBtnText: {
    fontSize: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  accentPicker: {
    flexDirection: "row",
    gap: 8,
  },
  accentCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accentCircleSelected: {
    transform: [{ scale: 1.15 }],
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  logoutSection: {
    marginTop: 10,
    marginBottom: 40,
  },
});
