// CompanyBioTab — company description, management, contact
// Converted from Flutter CompanyBioWidget

import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../styles/tokens';
import type { CompanyBioEntity } from '../../../domain/entities/CompanyBioEntity';
import type { QuoteEntity } from '../../../domain/entities/QuoteEntity';

interface Props {
  companyBio: CompanyBioEntity | null;
  quoteData: QuoteEntity | null;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function CompanyBioTab({ companyBio, quoteData }: Props) {
  const name = companyBio?.companyName ?? quoteData?.name ?? 'Company';

  async function handleWebsite() {
    const url = companyBio?.website;
    if (!url) {
      Alert.alert('Website', 'No website available');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open URL: ${url}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to open website');
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Company Header */}
      <View style={styles.companyHeader}>
        <Text style={styles.companyName}>{name}</Text>
        {quoteData?.sectorname && (
          <Text style={styles.sector}>{quoteData.sectorname}</Text>
        )}
      </View>

      {/* About */}
      {companyBio?.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.description}>{companyBio.description}</Text>
        </View>
      )}

      {/* Key Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Company Info</Text>
        <InfoRow label="Headquarters" value={companyBio?.hq ?? quoteData?.registeredstate} />
        <InfoRow label="Founded" value={companyBio?.founded} />
        <InfoRow label="Employees" value={companyBio?.employees?.toLocaleString('en-IN')} />
        <InfoRow label="Industry" value={companyBio?.industry ?? quoteData?.industryname} />
        <InfoRow label="Subsector" value={companyBio?.subsector} />
        <InfoRow label="ISIN" value={quoteData?.isincode} />
        <InfoRow label="Face Value" value={quoteData?.facevalue != null ? `₹${quoteData.facevalue}` : null} />
      </View>

      {/* Management */}
      {(companyBio?.ceo ?? companyBio?.chairman) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Management</Text>
          <InfoRow label="CEO" value={companyBio?.ceo} />
          <InfoRow label="Chairman" value={companyBio?.chairman} />
          {companyBio?.boardMembers && companyBio.boardMembers.length > 0 && (
            <>
              <Text style={styles.subLabel}>Board Members</Text>
              {companyBio.boardMembers.map((member, i) => (
                <Text key={i} style={styles.boardMember}>· {member}</Text>
              ))}
            </>
          )}
        </View>
      )}

      {/* Website */}
      {companyBio?.website && (
        <TouchableOpacity
          style={styles.websiteButton}
          onPress={handleWebsite}
          accessibilityLabel="Visit company website"
        >
          <Text style={styles.websiteText}>🌐 Visit Website</Text>
        </TouchableOpacity>
      )}

      {!companyBio && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Company information not available</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  companyHeader: {
    backgroundColor: '#1A237E',
    padding: spacing.xl,
    alignItems: 'center',
  },
  companyName: { fontSize: typography.subheading, fontFamily: fonts.bold, color: '#FFFFFF', textAlign: 'center' },
  sector: { fontSize: typography.small, fontFamily: fonts.regular, color: '#B3C5F7', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    margin: spacing.md,
    marginBottom: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardTitle: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary, flex: 1 },
  infoValue: { fontSize: typography.small, fontFamily: fonts.medium, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  subLabel: { fontSize: typography.small, fontFamily: fonts.medium, color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
  boardMember: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textPrimary, paddingVertical: 2 },
  websiteButton: {
    margin: spacing.md,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1976D2',
    alignItems: 'center',
  },
  websiteText: { color: '#1976D2', fontFamily: fonts.medium, fontSize: typography.body },
  emptyContainer: { flex: 1, alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: colors.textSecondary, fontSize: typography.body, fontFamily: fonts.regular },
});
