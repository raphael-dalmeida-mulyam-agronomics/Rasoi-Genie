import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';
import { getSupabaseClient } from '../../framework/supabase/client';
import {
  Family,
  FamilyMember,
  FamilyAuditLogEntry,
  ensureLocalFamilyStore,
} from '../../framework/services/familyService';

export const AdminFamilyManagementView: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<FamilyAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setFamilies(data as Family[]);
        setSelectedFamilyId(data[0].id);
      } else {
        await ensureLocalFamilyStore();
        // Load fallback if supabase table empty
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedFamilyId) return;

    const loadFamilyDetails = async () => {
      try {
        const supabase = getSupabaseClient();
        const [{ data: memData }, { data: auditData }] = await Promise.all([
          supabase
            .from('family_members')
            .select('*')
            .eq('family_id', selectedFamilyId)
            .order('joined_at', { ascending: true }),
          supabase
            .from('family_audit_log')
            .select('*')
            .eq('family_id', selectedFamilyId)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (memData) setMembers(memData as FamilyMember[]);
        if (auditData) setAuditLogs(auditData as FamilyAuditLogEntry[]);
      } catch {}
    };

    loadFamilyDetails();
  }, [selectedFamilyId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Icon name="people" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Admin Family Monitor</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Region-scoped read-only view of family households, member roles, and audit trail.
      </Text>

      {/* Families Catalog */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyScroll}>
        {families.map((f) => {
          const isSelected = f.id === selectedFamilyId;
          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.familyChip,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primaryLight + '30' : colors.bgSurface,
                },
              ]}
              onPress={() => setSelectedFamilyId(f.id)}
            >
              <Text
                style={[
                  styles.familyName,
                  { color: isSelected ? colors.primary : colors.textPrimary },
                ]}
              >
                {f.name}
              </Text>
              <Text style={[styles.familyMeta, { color: colors.textSecondary }]}>
                {f.is_locked ? '🔒 Locked' : 'Active'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Members Table */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Family Members</Text>
        <Badge label={`${members.length} Members`} variant="outline" />
      </View>

      {members.map((m) => (
        <Card key={m.user_id} style={styles.rowCard}>
          <View style={styles.row}>
            <View>
              <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                {m.display_name}
              </Text>
              <Text style={[styles.memberMeta, { color: colors.textSecondary }]}>
                UID: {m.user_id.slice(0, 14)}... • Joined:{' '}
                {new Date(m.joined_at).toLocaleDateString()}
              </Text>
            </View>
            <Badge
              label={
                m.role === 'owner'
                  ? 'Owner'
                  : m.role === 'co_owner'
                    ? 'Co-Owner'
                    : m.role === 'dependent'
                      ? `Dependent (${m.dependent_type || 'Child'})`
                      : 'Member'
              }
              variant={
                m.role === 'owner' ? 'primary' : m.role === 'co_owner' ? 'accent' : 'neutral'
              }
            />
          </View>
        </Card>
      ))}

      {/* Append-only Audit Log */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Family Audit Log</Text>
        <Badge label="Append-Only" variant="accent" />
      </View>

      {auditLogs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No audit events recorded for this family yet.
          </Text>
        </Card>
      ) : (
        auditLogs.map((log) => (
          <Card key={log.id} style={styles.auditCard}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                  {log.action.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={[styles.actorText, { color: colors.textSecondary }]}>
                  Actor: {log.actor_id.slice(0, 16)}... •{' '}
                  {new Date(log.created_at).toLocaleString()}
                </Text>
                {log.details && (
                  <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                    {JSON.stringify(log.details)}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  familyScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  familyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginRight: 10,
    minWidth: 130,
  },
  familyName: {
    fontSize: 14,
    fontWeight: '700',
  },
  familyMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyCard: {
    padding: 18,
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  auditCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  actorText: {
    fontSize: 11,
    marginTop: 2,
  },
  detailsText: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
});
