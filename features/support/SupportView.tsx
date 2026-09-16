import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';

interface SupportTicket {
  id: string;
  orderId?: string;
  subject: string;
  status: 'Open' | 'Resolved' | 'In Review';
  date: string;
  response?: string;
}

const INITIAL_FAQS = [
  {
    q: 'How are fresh ingredients preserved during delivery?',
    a: 'All our meal kits are packed with food-grade gel ice packs inside insulated thermal pouches. Fresh paneer, marinated meats, and seafood remain under 4°C until you open the box.',
  },
  {
    q: 'Are the masala sachets pre-mixed or whole?',
    a: 'Each recipe comes with 3-4 clearly numbered sachets: whole crackling spices (khada masala), authentic ground pastes, gravy premixes, and finishing aroma blends (kasuri methi & garam masala).',
  },
  {
    q: 'What if an ingredient is missing or damaged?',
    a: 'We offer an instant 100% replacement guarantee or immediate wallet refund within 2 hours. Use the "Report an Order Issue" form below.',
  },
  {
    q: 'Can I cook these if I have no cooking experience?',
    a: 'Yes! Our step-by-step interactive guide gives you exact heat levels, durations with built-in countdown timers, and visual color cues so you cannot make a mistake.',
  },
];

export const SupportView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { colors, radii, shadows } = useTheme();

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [orderId, setOrderId] = useState('');
  const [issueType, setIssueType] = useState('Missing or Damaged Ingredient');
  const [description, setDescription] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'TCK-201',
      orderId: 'ORD-9819',
      subject: 'Damaged packaging during transit',
      status: 'Resolved',
      date: 'Yesterday',
      response: '100% refund of ₹848 credited to your original UPI account.',
    },
  ]);

  const handleSubmitTicket = () => {
    if (!description.trim()) {
      Alert.alert('Details Required', 'Please explain the issue you experienced.');
      return;
    }

    const newTicket: SupportTicket = {
      id: 'TCK-' + Math.floor(100 + Math.random() * 900),
      orderId: orderId.trim() || undefined,
      subject: `${issueType} ${orderId ? `(${orderId})` : ''}`,
      status: 'In Review',
      date: 'Just now',
    };

    setTickets([newTicket, ...tickets]);
    setDescription('');
    setOrderId('');
    Alert.alert('Ticket Raised! 🎫', 'Our kitchen support team will resolve this within 1 hour.');
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Help & Customer Support
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Support Channels Banner */}
        <View
          style={[
            styles.bannerCard,
            {
              backgroundColor: colors.primaryLight,
              borderRadius: radii.xl,
              borderColor: colors.primary + '30',
            },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: colors.primaryDark }]}>
            RasoiGenie 24x7 Chef Concierge
          </Text>
          <Text style={[styles.bannerSub, { color: colors.primaryDark }]}>
            Need live cooking help? WhatsApp our culinary team at +91 98765 43210 or email
            support@mulyam.in
          </Text>
        </View>

        {/* SECTION 1: Report Order Issue */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Report an Order Issue / Request Refund
          </Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Missing items, delivery delay, or quality issues get instant replacement or refund.
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.border,
                borderRadius: radii.md,
              },
            ]}
            placeholder="Order ID (e.g. ORD-9821)"
            value={orderId}
            onChangeText={setOrderId}
          />

          <View style={styles.issuePillsRow}>
            {['Missing or Damaged Ingredient', 'Late Delivery', 'Masala Sachet Issue', 'Other'].map(
              (type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.issuePill,
                    {
                      backgroundColor: issueType === type ? colors.primary : colors.bgSubtle,
                      borderColor: issueType === type ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setIssueType(type)}
                >
                  <Text
                    style={{
                      color: issueType === type ? '#fff' : colors.textPrimary,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.border,
                borderRadius: radii.md,
              },
            ]}
            placeholder="Describe what went wrong with your meal kit..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          <Button title="Submit Support Ticket 🎫" onPress={handleSubmitTicket} />
        </View>

        {/* SECTION 2: Existing Support Tickets */}
        {tickets.length > 0 && (
          <View style={styles.ticketSection}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Your Support Tickets ({tickets.length})
            </Text>

            {tickets.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.ticketCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.lg,
                    borderColor: colors.borderLight,
                    ...shadows.soft,
                  },
                ]}
              >
                <View style={styles.ticketTop}>
                  <Text style={[styles.ticketId, { color: colors.textPrimary }]}>{t.id}</Text>
                  <Badge
                    label={t.status}
                    variant={t.status === 'Resolved' ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>
                <Text style={[styles.ticketSubject, { color: colors.textPrimary }]}>
                  {t.subject}
                </Text>
                <Text style={[styles.ticketDate, { color: colors.textMuted }]}>
                  Raised on {t.date}
                </Text>

                {t.response && (
                  <View
                    style={[
                      styles.ticketResponse,
                      { backgroundColor: colors.bgSubtle, borderRadius: radii.sm },
                    ]}
                  >
                    <Text style={[styles.responseHead, { color: colors.primary }]}>
                      Support Response:
                    </Text>
                    <Text style={[styles.responseText, { color: colors.textSecondary }]}>
                      {t.response}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* SECTION 3: FAQs */}
        <View
          style={[
            styles.faqCard,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Frequently Asked Questions
          </Text>

          {INITIAL_FAQS.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <View key={idx} style={[styles.faqItem, { borderBottomColor: colors.borderLight }]}>
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                >
                  <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{faq.q}</Text>
                  <Text style={[styles.faqArrow, { color: colors.primary }]}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {isExpanded && (
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.a}</Text>
                )}
              </View>
            );
          })}
        </View>
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
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  bannerCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 13,
  },
  issuePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  issuePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  textArea: {
    borderWidth: 1.5,
    padding: 12,
    height: 75,
    textAlignVertical: 'top',
    fontSize: 13,
    marginBottom: 12,
  },
  ticketSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ticketCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: '800',
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  ticketDate: {
    fontSize: 11,
  },
  ticketResponse: {
    padding: 8,
    marginTop: 8,
  },
  responseHead: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  responseText: {
    fontSize: 12,
  },
  faqCard: {
    padding: 18,
    borderWidth: 1,
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  faqArrow: {
    fontSize: 12,
    fontWeight: '800',
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
});
