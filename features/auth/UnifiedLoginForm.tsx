import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { Button } from '../../framework/ui/Button';
import { Input } from '../../framework/ui/Input';
import { Card } from '../../framework/ui/Card';

export interface UnifiedLoginFormProps {
  onSuccess?: () => void;
}

export const UnifiedLoginForm: React.FC<UnifiedLoginFormProps> = ({ onSuccess }) => {
  const {
    loginGoogle,
    requestPhoneOTP,
    confirmPhoneOTP,
    requestEmailOTP,
    confirmEmailOTP,
    loading,
    phoneNumber,
    emailAddress,
    activeOtpHint,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  const [phoneVal, setPhoneVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    const res = await loginGoogle();
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || 'Google login failed');
    }
  };

  const handleRequestOTP = async () => {
    setErrorMsg('');
    setOtpVal('');

    if (authMode === 'phone') {
      if (!phoneVal.trim() || phoneVal.replace(/\D/g, '').length < 10) {
        setErrorMsg('Please enter a valid 10-digit mobile number');
        return;
      }
      const res = await requestPhoneOTP(phoneVal);
      if (res.success) {
        setStep('otp');
        setResendTimer(30);
      } else {
        setErrorMsg(res.error || 'Failed to send OTP');
      }
    } else {
      const cleanEmail = emailVal.trim();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address');
        return;
      }
      const res = await requestEmailOTP(cleanEmail);
      if (res.success) {
        setStep('otp');
        setResendTimer(30);
      } else {
        setErrorMsg(res.error || 'Failed to send Email OTP');
      }
    }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    if (!otpVal.trim() || otpVal.length < 4) {
      setErrorMsg('Please enter the 6-digit verification code sent to your device');
      return;
    }

    if (authMode === 'phone') {
      const res = await confirmPhoneOTP(otpVal);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || 'Invalid Phone OTP code');
      }
    } else {
      const res = await confirmEmailOTP(emailVal.trim(), otpVal);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || 'Invalid Email OTP code');
      }
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>RasoiGenie Login / Sign Up</Text>
      <Text style={styles.subtitle}>
        Sign in to order chef-crafted meal kits or access store administration.
      </Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      {/* Google Auth Button */}
      <Button
        title="🌐  Continue with Google"
        variant="outline"
        onPress={handleGoogleLogin}
        loading={loading}
        style={styles.googleBtn}
        textStyle={styles.googleBtnText}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Auth Mode Switcher (Phone vs Email) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, authMode === 'phone' && styles.tabBtnActive]}
          onPress={() => {
            setAuthMode('phone');
            setStep('input');
            setErrorMsg('');
          }}
        >
          <Text style={[styles.tabText, authMode === 'phone' && styles.tabTextActive]}>
            📱 Mobile Number
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, authMode === 'email' && styles.tabBtnActive]}
          onPress={() => {
            setAuthMode('email');
            setStep('input');
            setErrorMsg('');
          }}
        >
          <Text style={[styles.tabText, authMode === 'email' && styles.tabTextActive]}>
            📧 Email Address
          </Text>
        </TouchableOpacity>
      </View>

      {step === 'input' ? (
        <View>
          {authMode === 'phone' ? (
            <Input
              label="Mobile Number"
              prefixText="+91"
              placeholder="98765 43210"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneVal}
              onChangeText={(val) => {
                setPhoneVal(val);
                setErrorMsg('');
              }}
            />
          ) : (
            <Input
              label="Email Address"
              placeholder="yourname@mulyam.in or personal email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailVal}
              onChangeText={(val) => {
                setEmailVal(val);
                setErrorMsg('');
              }}
              helperText="Admins: Use your @mulyam.in email for automatic dashboard access."
            />
          )}

          <Button
            title="Get Verification OTP Code"
            onPress={handleRequestOTP}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      ) : (
        <View>
          <Text style={styles.otpSentLabel}>
            OTP code sent to:{' '}
            <Text style={{ fontWeight: '800', color: '#0F172A' }}>
              {authMode === 'phone' ? `+91 ${phoneNumber || phoneVal}` : emailAddress || emailVal}
            </Text>
          </Text>

          <Text style={styles.otpSentSubtext}>
            Please check your {authMode === 'phone' ? 'SMS messages' : 'email inbox'} and enter the
            6-digit code below.
          </Text>

          <Input
            label="Enter 6-Digit Verification OTP"
            placeholder="e.g. 849201"
            keyboardType="number-pad"
            maxLength={6}
            value={otpVal}
            onChangeText={(val) => {
              setOtpVal(val);
              setErrorMsg('');
            }}
          />

          <Button
            title="Verify OTP & Sign In"
            onPress={handleVerifyOTP}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.resendRow}>
            <TouchableOpacity onPress={handleRequestOTP} disabled={resendTimer > 0}>
              <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend OTP Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setStep('input');
                setErrorMsg('');
              }}
            >
              <Text style={styles.changePhoneText}>Change Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  googleBtn: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  googleBtnText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  submitBtn: {
    marginTop: 8,
  },
  otpSentLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  otpHintBox: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  otpSentSubtext: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 18,
  },
  resendRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '700',
  },
  resendDisabled: {
    color: '#94A3B8',
  },
  changePhoneText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
