import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassCard } from '../components/ui/GlassCard';
import { Colors } from '../constants/colors';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="chevron-left" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>About Sync</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Hero Card */}
        <GlassCard style={styles.heroCard}>
          <View style={styles.appIconTile}>
            <Feather name="users" size={26} color={Colors.teal.bright} />
          </View>
          <Text style={styles.wordmark}>Sync</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>Version 1.0.0 (Build 1)</Text>
          </View>
          <Text style={styles.tagline}>
            Purposeful student networking.{'\n'}No feeds. No followers. Just connections.
          </Text>
        </GlassCard>

        {/* App Info Card */}
        <Text style={styles.sectionLabel}>APP INFO</Text>
        <GlassCard style={styles.rowCard}>
          {/* Version */}
          <View style={styles.infoRow}>
            <View style={[styles.rowIcon, styles.rowIconTeal]}>
              <Feather name="smartphone" size={14} color={Colors.teal.bright} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowPrimary}>Version</Text>
              <Text style={styles.rowSecondary}>1.0.0 (Build 1)</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Platform */}
          <View style={styles.infoRow}>
            <View style={[styles.rowIcon, styles.rowIconTeal]}>
              <Feather name="sun" size={14} color={Colors.teal.bright} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowPrimary}>Platform</Text>
              <Text style={styles.rowSecondary}>iOS 16.0 and later</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Contact */}
          <View style={styles.infoRow}>
            <View style={[styles.rowIcon, styles.rowIconTeal]}>
              <Feather name="mail" size={14} color={Colors.teal.bright} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowSecondary}>Support & Contact</Text>
              <Text style={styles.rowEmail}>about@sync.io</Text>
            </View>
          </View>
        </GlassCard>

        {/* Legal Card */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <GlassCard style={styles.rowCard}>
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => router.push('/terms')}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, styles.rowIconNeutral]}>
              <Feather name="file-text" size={14} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={styles.legalLabel}>Terms of Service</Text>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => router.push('/privacy')}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, styles.rowIconNeutral]}>
              <Feather name="shield" size={14} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={styles.legalLabel}>Privacy Policy</Text>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        </GlassCard>

        {/* Footer */}
        <Text style={styles.footer}>Made with care for students worldwide</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  scroll: { paddingHorizontal: 14 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: { width: 32 },

  // Hero card
  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  appIconTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(27,138,143,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(27,138,143,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  wordmark: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  versionBadge: {
    backgroundColor: 'rgba(27,138,143,0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(27,138,143,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  versionBadgeText: {
    fontSize: 10,
    color: Colors.teal.light,
    fontWeight: '500',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 13 * 1.5,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 2,
  },

  // Row card shared
  rowCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 12,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconTeal: {
    backgroundColor: 'rgba(27,138,143,0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(27,138,143,0.3)',
  },
  rowIconNeutral: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 44,
  },
  rowContent: { flex: 1 },
  rowPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  rowSecondary: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  rowEmail: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 2,
  },

  // Legal rows
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 44,
  },
  legalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // Footer
  footer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
});
