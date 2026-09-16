import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge } from '../../framework/ui/Badge';

interface AlertItem {
  id: string;
  type: 'order' | 'promo' | 'launch';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'n-1',
    type: 'order',
    title: 'Order ORD-9821 Dispatched! 🛵',
    message:
      'Your Paneer Butter Masala meal kit is out for delivery with temperature-controlled ice pack.',
    time: '25 mins ago',
    read: false,
  },
  {
    id: 'n-2',
    type: 'promo',
    title: 'Weekend Cooking Special: Flat ₹100 OFF',
    message: 'Use code RASOI100 on orders above ₹499. Fresh Byadgi masalas ready to ship.',
    time: '3 hours ago',
    read: false,
  },
  {
    id: 'n-3',
    type: 'launch',
    title: 'New Kit Alert: Coastal Prawns Ghee Roast 🦐',
    message:
      'Authentic Mangalorean Kundapura recipe with freshly roasted Byadgi chili paste is now live!',
    time: '1 day ago',
    read: true,
  },
];

export const NotificationsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { notifications, updateNotifications } = usePreferences();
  const { colors, radii, shadows } = useTheme();
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={{ fontSize: 18 }}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={[styles.markReadText, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Notification Preferences Toggle Card */}
        <View
          style={[
            styles.settingsCard,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
            Notification Channels
          </Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Push Notifications
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Real-time delivery milestones & kit offers
              </Text>
            </View>
            <Switch
              value={notifications.orderUpdates}
              onValueChange={(val) => updateNotifications({ orderUpdates: val })}
              trackColor={{ true: colors.primary, false: colors.borderLight }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                SMS Order Updates
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Rider arrival OTP & courier alerts
              </Text>
            </View>
            <Switch
              value={notifications.smsAlerts}
              onValueChange={(val) => updateNotifications({ smsAlerts: val })}
              trackColor={{ true: colors.primary, false: colors.borderLight }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Email Recipe Digest
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Weekly chef secrets & new season arrivals
              </Text>
            </View>
            <Switch
              value={notifications.emailDigest}
              onValueChange={(val) => updateNotifications({ emailDigest: val })}
              trackColor={{ true: colors.primary, false: colors.borderLight }}
            />
          </View>
        </View>

        {/* Alerts Feed */}
        <Text style={[styles.feedTitle, { color: colors.textMuted }]}>Recent Updates</Text>

        {alerts.map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertCard,
              {
                backgroundColor: alert.read ? colors.bgSurface : colors.primaryLight + '30',
                borderRadius: radii.lg,
                borderColor: colors.borderLight,
                borderLeftColor: alert.read ? colors.borderLight : colors.primary,
                borderLeftWidth: 4,
                ...shadows.soft,
              },
            ]}
          >
            <View style={styles.alertHeader}>
              <Badge
                label={alert.type.toUpperCase()}
                variant={
                  alert.type === 'order' ? 'info' : alert.type === 'promo' ? 'warning' : 'accent'
                }
                size="sm"
              />
              <Text style={[styles.alertTime, { color: colors.textMuted }]}>{alert.time}</Text>
            </View>
            <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>{alert.title}</Text>
            <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
              {alert.message}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  settingsCard: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  feedTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  alertCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  alertTime: {
    fontSize: 11,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
});
