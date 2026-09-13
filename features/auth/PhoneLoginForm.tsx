import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { Button } from '../../framework/ui/Button';
import { Input } from '../../framework/ui/Input';
import { Card } from '../../framework/ui/Card';

export interface PhoneLoginFormProps {
  onSuccess?: () => void;
}

export const PhoneLoginForm: React.FC<PhoneLoginFormProps> = ({ onSuccess }) => {
  const { requestPhoneOTP, confirmPhoneOTP, loading, verificationId, phoneNumber } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
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

  const handleSendOTP = async () => {
    setErrorMsg('');
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    const res = await requestPhoneOTP(phone);
    if (res.success) {
      setStep('otp');
      setResendTimer(30);
    } else {
      setErrorMsg(res.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    if (!otp.trim() || otp.length < 4) {
      setErrorMsg('Please enter the verification code sent to your mobile number');
      return;
    }

    const res = await confirmPhoneOTP(otp);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || 'Verification failed. Check the OTP code.');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setErrorMsg('');
    const res = await requestPhoneOTP(phone);
    if (res.success) {
      setResendTimer(30);
    } else {
      setErrorMsg(res.error || 'Failed to resend OTP');
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>
        {step === 'phone' ? 'Customer Login' : 'Enter OTP Verification Code'}
      </Text>
      <Text style={styles.subtitle}>
        {step === 'phone'
          ? 'Enter your mobile number to receive a 6-digit OTP code.'
          : `OTP code sent to +91 ${phoneNumber || phone}`}
      </Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      {step === 'phone' ? (
        <View>
          <Input
            label="Mobile Number"
            prefixText="+91"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={(val) => {
              setPhone(val);
              setErrorMsg('');
            }}
          />

          <Button
            title="Send OTP Code"
            onPress={handleSendOTP}
            loading={loading}
            style={styles.btn}
          />
        </View>
      ) : (
        <View>
          <Input
            label="Enter 6-Digit OTP"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(val) => {
              setOtp(val);
              setErrorMsg('');
            }}
          />

          <Button
            title="Verify & Proceed"
            onPress={handleVerifyOTP}
            loading={loading}
            style={styles.btn}
          />

          <View style={styles.resendRow}>
            <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
              <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setStep('phone');
                setErrorMsg('');
              }}
            >
              <Text style={styles.changePhoneText}>Change Phone Number</Text>
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
    fontSize: 22,
    fontWeight: '800',
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
  btn: {
    marginTop: 8,
  },
  resendRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '700',
  },
  resendDisabled: {
    color: '#94A3B8',
  },
  changePhoneText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
