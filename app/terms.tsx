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

const SECTIONS: {
  num: number;
  title: string;
  body?: string;
  bullets?: string[];
  roseBox?: string;
}[] = [
  {
    num: 1,
    title: 'Acceptance of Terms',
    body: 'By creating an account or using Sync ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not access or use the App. These Terms constitute a legally binding agreement between you and [Company Name] ("we," "us," or "our"), registered in Germany under registration number [Registration Number].',
  },
  {
    num: 2,
    title: 'Eligibility',
    body: 'You must be at least 16 years of age to create an account and use Sync. This minimum age reflects the threshold under Article 8 of the General Data Protection Regulation (GDPR) for consent to personal data processing in Germany. By registering, you confirm that you meet this requirement and have the legal capacity to enter into a binding agreement. We reserve the right to verify eligibility and to suspend or delete accounts where this requirement is not met.',
  },
  {
    num: 3,
    title: 'User Accounts',
    body: 'You are solely responsible for safeguarding your login credentials and for all activity that occurs under your account. You must notify us immediately at about@sync.io if you suspect any unauthorised access or security breach. Account credentials are personal and non-transferable; you may not share, sell, or otherwise transfer access to your account. You agree to provide accurate, current, and complete information when creating your profile and to keep that information up to date.',
  },
  {
    num: 4,
    title: 'Acceptable Use',
    body: 'You agree not to:',
    bullets: [
      'Impersonate any person or misrepresent your identity, affiliation, or academic institution',
      'Harass, threaten, intimidate, abuse, or harm other users in any way',
      'Post, share, or transmit spam, fraudulent, deceptive, or misleading content',
      'Attempt to circumvent or undermine the App\'s security, authentication, or access controls',
      'Use the App for unsolicited commercial solicitation, advertising, or promotional purposes',
      'Collect or harvest personal data of other users without their explicit consent',
      'Violate any applicable local, national, or international law or regulation, including the GDPR',
    ],
  },
  {
    num: 5,
    title: 'User Content',
    body: 'You retain full ownership of all content you submit to the App, including profile information and messages ("User Content"). By submitting User Content, you grant [Company Name] a limited, non-exclusive, royalty-free, worldwide licence to store, display, and transmit that content solely as necessary to operate and provide the App. This licence terminates when you delete the relevant content or your account. We do not sell or licence your User Content to third parties. The processing of your personal data in connection with User Content is governed by our Privacy Policy.',
  },
  {
    num: 6,
    title: 'Connections & Safety',
    body: 'Sync facilitates introductions between students but does not conduct background checks on users. We cannot guarantee the accuracy of information provided by other users, nor are we responsible for the conduct of users on or off the platform. Always exercise personal judgement and take appropriate precautions when interacting with or meeting connections in person. If you encounter behaviour that violates these Terms, please report it to us at about@sync.io.',
  },
  {
    num: 7,
    title: 'Termination',
    body: 'We reserve the right to suspend or permanently terminate your account, without prior notice, if we reasonably believe you have violated these Terms or if required by applicable law. Upon termination, your right to access the App ceases immediately. You may request deletion of your account at any time via Settings → Delete account or by contacting us at about@sync.io. Account deletion and the handling of your personal data thereafter will be processed in accordance with our Privacy Policy and applicable statutory data retention obligations.',
  },
  {
    num: 8,
    title: 'Disclaimer of Warranties',
    roseBox: 'The App is provided on an "as is" and "as available" basis, without warranties of any kind, to the fullest extent permitted by applicable law. We do not warrant that the App will be uninterrupted, error-free, or free of harmful components; that match suggestions will be accurate or suitable; or that other users will act in accordance with these Terms. Nothing in this clause excludes or limits liability for death, personal injury, or damages caused by our wilful misconduct or gross negligence, which cannot be excluded under mandatory provisions of German law (§ 309 No. 7 BGB).',
  },
  {
    num: 9,
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted under applicable German law, [Company Name] shall not be liable for any indirect, incidental, special, punitive, or consequential damages — including loss of data, revenue, goodwill, or business opportunity — arising from your use of, or inability to use, the App. Our aggregate liability to you for direct damages shall not exceed the total amount paid by you, if any, for access to the App in the twelve months preceding the relevant claim. Nothing in these Terms limits or excludes liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for any liability that cannot lawfully be excluded or limited under § 309 No. 7 BGB or other mandatory provisions of German consumer protection law.',
  },
  {
    num: 10,
    title: 'Governing Law & Jurisdiction',
    body: 'These Terms are governed by and construed in accordance with the laws of the Federal Republic of Germany, excluding its conflict-of-law rules. If you are a consumer resident in the European Union, you also benefit from any mandatory protective provisions of the law of your country of habitual residence that cannot be derogated from by agreement. Subject to those mandatory consumer protection rules, any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Stuttgart, Germany. The European Commission provides an online dispute resolution platform at ec.europa.eu/consumers/odr, which you may use to submit a complaint.',
  },
  {
    num: 11,
    title: 'Changes to Terms',
    body: 'We may update these Terms periodically to reflect changes in our services, legal requirements, or business practices. We will notify you of material changes via push notification and/or to the email address associated with your account at least 14 days before the changes take effect. Your continued use of the App after the effective date of revised Terms constitutes your acceptance of those changes. If you do not agree to the revised Terms, you must stop using the App and may delete your account as described above.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: 100 },
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
          <Text style={styles.screenTitle}>Terms of Service</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content Card */}
        <GlassCard style={styles.contentCard}>
          {SECTIONS.map((section, index) => (
            <View key={section.num}>
              <Text
                style={[styles.sectionTitle, index === 0 && styles.sectionTitleFirst]}
                accessibilityRole="header"
              >
                {section.num}. {section.title}
              </Text>

              {section.body && (
                <Text style={styles.sectionBody}>{section.body}</Text>
              )}

              {section.bullets && (
                <View style={styles.bulletList}>
                  {section.bullets.map((bullet, i) => (
                    <View
                      key={i}
                      style={[styles.bulletRow, i < section.bullets!.length - 1 && styles.bulletGap]}
                    >
                      <Text style={styles.bulletDot}>·</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}

              {section.roseBox && (
                <View style={styles.roseBox}>
                  <Text style={styles.roseBoxText}>{section.roseBox}</Text>
                </View>
              )}
            </View>
          ))}
        </GlassCard>

        {/* Contact Block */}
        <View style={styles.contactBlock}>
          <Text style={styles.contactLabel}>QUESTIONS ABOUT TERMS?</Text>
          <Text style={styles.contactEmail}>about@sync.io</Text>
        </View>
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
    marginBottom: 16,
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

  // Content card
  contentCard: {
    padding: 18,
    marginBottom: 12,
  },

  // Section typography
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  sectionBody: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 12 * 1.6,
  },

  // Bullet list
  bulletList: {
    marginTop: 6,
    paddingLeft: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletGap: {
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginRight: 6,
    lineHeight: 12 * 1.6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 12 * 1.6,
  },

  // Rose accent box (Disclaimer of Warranties)
  roseBox: {
    backgroundColor: 'rgba(212,107,158,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(212,107,158,0.20)',
    borderRadius: 10,
    padding: 10,
  },
  roseBoxText: {
    fontSize: 12,
    color: 'rgba(232,143,181,0.9)',
    lineHeight: 12 * 1.5,
  },

  // Contact block
  contactBlock: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.teal.light,
  },
});
