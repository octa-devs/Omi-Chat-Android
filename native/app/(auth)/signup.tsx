import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, User, AtSign, UserPlus } from "lucide-react-native";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { Logo } from "@/components/ui/Logo";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { AuroraBackdrop } from "@/components/ui/AuroraBackdrop";

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { theme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AuroraBackdrop />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <Logo size={56} showText={false} />
            <Text style={[styles.brandTitle, { color: theme.colors.foreground }]}>
              Create Account
            </Text>
            <Text style={[styles.brandSubtitle, { color: theme.colors.mutedForeground }]}>
              Join Omi Chat in seconds
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Field
              label="Full Name"
              placeholder="e.g. Alex Morgan"
              value={displayName}
              onChangeText={setDisplayName}
              icon={<User size={18} color={theme.colors.mutedForeground} />}
            />

            <Field
              label="Username"
              placeholder="e.g. alexm"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              icon={<AtSign size={18} color={theme.colors.mutedForeground} />}
            />

            <Field
              label="Email Address"
              placeholder="you@domain.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Mail size={18} color={theme.colors.mutedForeground} />}
            />

            <Field
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Lock size={18} color={theme.colors.mutedForeground} />}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              icon={<UserPlus size={18} color="#ffffff" />}
              style={{ marginTop: 8 }}
              fullWidth
            />
          </View>

          {/* Switch to Login */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.colors.mutedForeground }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 10,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
