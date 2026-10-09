import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import {
  MOCK_TEST_CARDS,
  MOCK_UPI_APPS,
  MOCK_NET_BANKS,
  MockCardPreset,
  SupportedPaymentMethod,
  PaymentCustomerInfo,
  executeMockGatewayTransaction,
  PaymentProcessResult,
} from '../../framework/services/paymentGatewayService';

interface MockPaymentGatewayModalProps {
  visible: boolean;
  orderId: string;
  payableAmount: number;
  initialMethod?: SupportedPaymentMethod;
  customer: PaymentCustomerInfo;
  onSuccess: (result: PaymentProcessResult) => void;
  onFailure: (errorMessage: string) => void;
  onClose: () => void;
}

type GatewayTab = 'upi' | 'card' | 'netbanking';

export const MockPaymentGatewayModal: React.FC<MockPaymentGatewayModalProps> = ({
  visible,
  orderId,
  payableAmount,
  initialMethod = 'UPI',
  customer,
  onSuccess,
  onFailure,
  onClose,
}) => {
  const { colors, radii, shadows, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<GatewayTab>(initialMethod === 'Card' ? 'card' : 'upi');

  // UPI State
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>(MOCK_UPI_APPS[0]!.id);
  const [customUpiId, setCustomUpiId] = useState(
    `${customer.name.toLowerCase().replace(/\s+/g, '')}@okaxis`,
  );

  // Card State
  const [selectedCard, setSelectedCard] = useState<MockCardPreset>(MOCK_TEST_CARDS[0]!);
  const [cardNumber, setCardNumber] = useState(MOCK_TEST_CARDS[0]!.cardNumber);
  const [cardExpiry, setCardExpiry] = useState(MOCK_TEST_CARDS[0]!.expiry);
  const [cardCvv, setCardCvv] = useState(MOCK_TEST_CARDS[0]!.cvv);

  // Net Banking State
  const [selectedBank, setSelectedBank] = useState<string>(MOCK_NET_BANKS[0]!.id);

  // Processing Simulation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [paymentOutcome, setPaymentOutcome] = useState<'idle' | 'success' | 'failed'>('idle');

  useEffect(() => {
    if (visible) {
      setActiveTab(initialMethod === 'Card' ? 'card' : 'upi');
      setIsProcessing(false);
      setPaymentOutcome('idle');
      setProcessingStatus('');
    }
  }, [visible, initialMethod]);

  const handleSelectCardPreset = (preset: MockCardPreset) => {
    setSelectedCard(preset);
    setCardNumber(preset.cardNumber);
    setCardExpiry(preset.expiry);
    setCardCvv(preset.cvv);
  };

  const handleExecutePayment = async (
    forceOutcome?: 'success' | 'decline' | 'insufficient_funds',
  ) => {
    setIsProcessing(true);
    setPaymentOutcome('idle');
    setProcessingStatus('Connecting to secure banking gateway...');

    // Realistic multi-step payment gateway simulation
    setTimeout(() => {
      setProcessingStatus('Verifying sandbox credentials with NPCI / Visa...');
    }, 500);

    setTimeout(async () => {
      setProcessingStatus('Authorizing transaction token...');

      const targetOutcome =
        forceOutcome || (activeTab === 'card' ? selectedCard.outcome : 'success');

      const result = await executeMockGatewayTransaction({
        orderId,
        payableAmount,
        paymentMethod: activeTab === 'card' ? 'Card' : 'UPI',
        customer,
        outcome: targetOutcome,
      });

      if (result.success) {
        setProcessingStatus('Payment Authorized! Confirming with RasoiGenie...');
        setPaymentOutcome('success');
        setTimeout(() => {
          setIsProcessing(false);
          onSuccess(result);
        }, 600);
      } else {
        setProcessingStatus(result.error || 'Payment declined by bank.');
        setPaymentOutcome('failed');
        setTimeout(() => {
          setIsProcessing(false);
          onFailure(result.error || 'Payment declined by bank');
        }, 800);
      }
    }, 1100);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          testID="mock-payment-gateway-modal"
          style={[
            styles.modalCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, ...shadows.card },
          ]}
        >
          {/* Top Bar: Merchant info & Sandbox Tag */}
          <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.merchantInfo}>
              <View style={[styles.merchantLogo, { backgroundColor: colors.primary }]}>
                <Icon name="restaurant" size={18} color="#FFFFFF" />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={[styles.merchantName, { color: colors.textPrimary }]}>RasoiPay</Text>
                  <View style={styles.sandboxBadge}>
                    <Icon name="flask" size={11} color="#D97706" />
                    <Text style={styles.sandboxText}>TEST SANDBOX</Text>
                  </View>
                </View>
                <Text style={[styles.orderRefText, { color: colors.textMuted }]}>
                  Ref: {orderId} • {customer.name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              testID="mock-gateway-close-btn"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Amount Ribbon */}
          <View
            style={[
              styles.amountRibbon,
              {
                backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
                borderColor: colors.primary + '40',
              },
            ]}
          >
            <View>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                Amount Payable
              </Text>
              <Text
                testID="mock-gateway-amount-display"
                style={[styles.amountValue, { color: colors.primary }]}
              >
                ₹{Math.round(payableAmount).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.secureTag}>
              <Icon name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.secureTagText}>256-bit Mock Encrypted</Text>
            </View>
          </View>

          {/* In-Flight Processing Screen */}
          {isProcessing ? (
            <View style={styles.processingWrap}>
              {paymentOutcome === 'success' ? (
                <View style={styles.outcomeIconCircleSuccess}>
                  <Icon name="checkmark" size={32} color="#059669" />
                </View>
              ) : paymentOutcome === 'failed' ? (
                <View style={styles.outcomeIconCircleFail}>
                  <Icon name="alert-circle" size={32} color="#DC2626" />
                </View>
              ) : (
                <ActivityIndicator size="large" color={colors.primary} />
              )}
              <Text style={[styles.processingTitle, { color: colors.textPrimary }]}>
                {paymentOutcome === 'success'
                  ? 'Payment Successful!'
                  : paymentOutcome === 'failed'
                    ? 'Payment Failed'
                    : 'Processing Sandbox Payment...'}
              </Text>
              <Text style={[styles.processingSub, { color: colors.textSecondary }]}>
                {processingStatus}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Payment Methods Nav */}
              <View
                style={[
                  styles.tabsRow,
                  { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                ]}
              >
                <TouchableOpacity
                  testID="mock-gateway-tab-upi"
                  onPress={() => setActiveTab('upi')}
                  style={[
                    styles.tabItem,
                    activeTab === 'upi' && [
                      styles.activeTabItem,
                      { backgroundColor: colors.bgSurface },
                    ],
                  ]}
                >
                  <Icon
                    name="phone-portrait"
                    size={14}
                    color={activeTab === 'upi' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: activeTab === 'upi' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="mock-gateway-tab-card"
                  onPress={() => setActiveTab('card')}
                  style={[
                    styles.tabItem,
                    activeTab === 'card' && [
                      styles.activeTabItem,
                      { backgroundColor: colors.bgSurface },
                    ],
                  ]}
                >
                  <Icon
                    name="card"
                    size={14}
                    color={activeTab === 'card' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: activeTab === 'card' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Cards
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="mock-gateway-tab-netbanking"
                  onPress={() => setActiveTab('netbanking')}
                  style={[
                    styles.tabItem,
                    activeTab === 'netbanking' && [
                      styles.activeTabItem,
                      { backgroundColor: colors.bgSurface },
                    ],
                  ]}
                >
                  <Icon
                    name="business"
                    size={14}
                    color={activeTab === 'netbanking' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: activeTab === 'netbanking' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Net Banking
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: UPI */}
              {activeTab === 'upi' && (
                <View style={styles.tabContent}>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Select Simulated UPI Application
                  </Text>
                  <View style={styles.upiGrid}>
                    {MOCK_UPI_APPS.map((app) => {
                      const isSelected = selectedUpiApp === app.id;
                      return (
                        <TouchableOpacity
                          key={app.id}
                          testID={`mock-gateway-upi-${app.id}`}
                          onPress={() => {
                            setSelectedUpiApp(app.id);
                            setCustomUpiId(
                              `${customer.name.toLowerCase().replace(/\s+/g, '')}${app.handleSuffix}`,
                            );
                          }}
                          style={[
                            styles.upiCard,
                            {
                              backgroundColor: isSelected ? colors.primary + '15' : colors.bgSubtle,
                              borderColor: isSelected ? colors.primary : colors.borderLight,
                            },
                          ]}
                        >
                          <View style={[styles.upiAppCircle, { backgroundColor: app.color }]}>
                            <Icon name={app.iconName} size={16} color="#FFFFFF" />
                          </View>
                          <Text style={[styles.upiAppName, { color: colors.textPrimary }]}>
                            {app.name}
                          </Text>
                          {isSelected && (
                            <Icon name="checkmark-circle" size={14} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.inputWrap}>
                    <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                      Test VPA / UPI ID
                    </Text>
                    <TextInput
                      testID="mock-gateway-upi-input"
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.bgPrimary,
                          color: colors.textPrimary,
                          borderColor: colors.borderLight,
                        },
                      ]}
                      value={customUpiId}
                      onChangeText={setCustomUpiId}
                      placeholder="e.g. mobile@upi"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              )}

              {/* TAB 2: CARDS */}
              {activeTab === 'card' && (
                <View style={styles.tabContent}>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Choose Test Card Scenario
                  </Text>
                  <View style={styles.presetsList}>
                    {MOCK_TEST_CARDS.map((preset) => {
                      const isSelected = selectedCard.id === preset.id;
                      return (
                        <TouchableOpacity
                          key={preset.id}
                          testID={`mock-gateway-card-${preset.id}`}
                          onPress={() => handleSelectCardPreset(preset)}
                          style={[
                            styles.cardPresetItem,
                            {
                              backgroundColor: isSelected ? colors.primary + '15' : colors.bgSubtle,
                              borderColor: isSelected ? colors.primary : colors.borderLight,
                            },
                          ]}
                        >
                          <View style={styles.cardPresetHeader}>
                            <View style={styles.cardPresetTitleRow}>
                              <Icon
                                name="card"
                                size={16}
                                color={
                                  preset.outcome === 'success'
                                    ? '#059669'
                                    : preset.outcome === 'decline'
                                      ? '#DC2626'
                                      : '#D97706'
                                }
                              />
                              <Text style={[styles.cardPresetLabel, { color: colors.textPrimary }]}>
                                {preset.label}
                              </Text>
                            </View>
                            <Text
                              style={[styles.cardPresetNumber, { color: colors.textSecondary }]}
                            >
                              •••• {preset.cardNumber.slice(-4)}
                            </Text>
                          </View>
                          <Text style={[styles.cardPresetDesc, { color: colors.textMuted }]}>
                            {preset.description}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.cardInputRow}>
                    <View style={[styles.inputWrap, { flex: 2, marginRight: 8 }]}>
                      <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                        Card Number
                      </Text>
                      <TextInput
                        testID="mock-gateway-card-num-input"
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: colors.bgPrimary,
                            color: colors.textPrimary,
                            borderColor: colors.borderLight,
                          },
                        ]}
                        value={cardNumber}
                        onChangeText={setCardNumber}
                        maxLength={19}
                      />
                    </View>
                    <View style={[styles.inputWrap, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                        Expiry
                      </Text>
                      <TextInput
                        testID="mock-gateway-card-expiry-input"
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: colors.bgPrimary,
                            color: colors.textPrimary,
                            borderColor: colors.borderLight,
                          },
                        ]}
                        value={cardExpiry}
                        onChangeText={setCardExpiry}
                        maxLength={5}
                      />
                    </View>
                    <View style={[styles.inputWrap, { flex: 1 }]}>
                      <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                        CVV
                      </Text>
                      <TextInput
                        testID="mock-gateway-card-cvv-input"
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: colors.bgPrimary,
                            color: colors.textPrimary,
                            borderColor: colors.borderLight,
                          },
                        ]}
                        value={cardCvv}
                        onChangeText={setCardCvv}
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 3: NET BANKING */}
              {activeTab === 'netbanking' && (
                <View style={styles.tabContent}>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Select Simulated Retail Bank
                  </Text>
                  <View style={styles.bankGrid}>
                    {MOCK_NET_BANKS.map((b) => {
                      const isSelected = selectedBank === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          testID={`mock-gateway-bank-${b.id}`}
                          onPress={() => setSelectedBank(b.id)}
                          style={[
                            styles.bankItem,
                            {
                              backgroundColor: isSelected ? colors.primary + '15' : colors.bgSubtle,
                              borderColor: isSelected ? colors.primary : colors.borderLight,
                            },
                          ]}
                        >
                          <Text style={[styles.bankCode, { color: colors.primary }]}>{b.code}</Text>
                          <Text style={[styles.bankName, { color: colors.textPrimary }]}>
                            {b.name}
                          </Text>
                          {isSelected && (
                            <Icon name="checkmark-circle" size={14} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsWrap}>
                <TouchableOpacity
                  testID="mock-gateway-pay-success-btn"
                  onPress={() => handleExecutePayment('success')}
                  style={[styles.primaryPayBtn, { backgroundColor: colors.primary }]}
                >
                  <Icon name="lock-closed" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryPayText}>
                    Simulate Payment Success • ₹{Math.round(payableAmount).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>

                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    testID="mock-gateway-simulate-failure-btn"
                    onPress={() => handleExecutePayment('decline')}
                    style={[styles.failSimBtn, { borderColor: '#EF4444' }]}
                  >
                    <Icon name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.failSimText}>Simulate Bank Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="mock-gateway-cancel-btn"
                    onPress={onClose}
                    style={[styles.cancelBtn, { borderColor: colors.borderLight }]}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  merchantLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '800',
  },
  sandboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sandboxText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  orderRefText: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  amountRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  secureTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabItem: {
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabContent: {
    gap: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  upiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  upiCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  upiAppCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upiAppName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputWrap: {
    gap: 4,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetsList: {
    gap: 8,
  },
  cardPresetItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  cardPresetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPresetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardPresetLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardPresetNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardPresetDesc: {
    fontSize: 11,
  },
  cardInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankItem: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  bankCode: {
    fontSize: 11,
    fontWeight: '800',
  },
  bankName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actionsWrap: {
    gap: 8,
    marginTop: 6,
  },
  primaryPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryPayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  failSimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  failSimText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  processingWrap: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  outcomeIconCircleSuccess: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outcomeIconCircleFail: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  processingSub: {
    fontSize: 13,
    textAlign: 'center',
  },
});
