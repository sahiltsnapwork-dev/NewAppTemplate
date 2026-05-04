// ─── Company Bio Tab ─────────────────────────────────────────────────────────
// Maps to Flutter: widgets/company_bio/presentation/views/company_bio_ui.dart

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector, selectCompanyBio, selectCompany } from '../../store/hooks';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

const InfoRow: React.FC<{ label: string; value?: string | number; isLink?: boolean }> = ({
  label, value, isLink,
}) => {
  const handlePress = () => {
    if (isLink && typeof value === 'string') {
      Linking.openURL(value).catch(() =>
        Alert.alert('Error', 'Unable to open URL'),
      );
    }
  };

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TouchableOpacity onPress={handlePress} disabled={!isLink} style={styles.infoValueWrap}>
        <Text style={[styles.infoValue, isLink && styles.linkText]} numberOfLines={1}>
          {value ?? '—'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export const CompanyBioTab: React.FC<Props> = ({ symbol }) => {
  const bio = useAppSelector(selectCompanyBio);
  const company = useAppSelector(selectCompany);
  const loading = useAppSelector(s => s.getQuote.companyBioLoading);

  if (loading && !bio) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const displayName = bio?.companyName ?? company.name ?? symbol;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>{displayName}</Text>
        {bio?.industry && <Text style={styles.industry}>{bio.industry}</Text>}
        {bio?.subsector && <Text style={styles.subsector}>{bio.subsector}</Text>}
      </View>

      {/* About */}
      {bio?.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.description}>{bio.description}</Text>
        </View>
      )}

      {/* Key Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Company Information</Text>
        <InfoRow label="Founded" value={bio?.founded} />
        <InfoRow label="Headquarters" value={bio?.headquarters} />
        <InfoRow label="CEO" value={bio?.ceo} />
        <InfoRow label="Chairman" value={bio?.chairman} />
        <InfoRow label="Employees" value={bio?.employees?.toLocaleString('en-IN')} />
        <InfoRow label="ISIN" value={company.isin} />
        <InfoRow label="Exchange Listed" value={[
          company.isNseListed === 'Y' ? 'NSE' : null,
          company.isBseListed === 'Y' ? 'BSE' : null,
        ].filter(Boolean).join(', ')} />
        {bio?.website && (
          <InfoRow label="Website" value={bio.website} isLink />
        )}
      </View>

      {/* Products & Services */}
      {bio?.services && bio.services.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Segments</Text>
          <View style={styles.serviceGrid}>
            {bio.services.map((service, i) => (
              <View key={i} style={styles.serviceBadge}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Board Members */}
      {bio?.boardMembers && bio.boardMembers.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Board of Directors</Text>
          {bio.boardMembers.map((member, i) => (
            <View key={i} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>{member.charAt(0)}</Text>
              </View>
              <Text style={styles.memberName}>{member}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  companyName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 4,
  },
  industry: { color: COLORS.primary, fontSize: FONT_SIZE.sm },
  subsector: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    marginBottom: SPACING.sm,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  infoLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, flex: 1 },
  infoValueWrap: { flex: 1.5, alignItems: 'flex-end' },
  infoValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, textAlign: 'right' },
  linkText: { color: COLORS.primary, textDecorationLine: 'underline' },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  serviceBadge: {
    backgroundColor: 'rgba(26,115,232,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.3)',
  },
  serviceText: { color: COLORS.primary, fontSize: FONT_SIZE.xs },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { color: '#fff', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  memberName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm },
});
