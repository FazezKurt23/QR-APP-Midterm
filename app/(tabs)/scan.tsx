import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
=======
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { registerAttendance } from '@/lib/attendance';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
<<<<<<< HEAD
=======
  const [torch, setTorch] = useState(false);
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<Role | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);
<<<<<<< HEAD
=======
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0

  useEffect(() => {
    let active = true;
    if (!user) {
      setProfileName(null);
      setProfileRole(null);
      setIdentityLoading(false);
      return;
    }
    setIdentityLoading(true);
    getProfile(user.id).then((profile) => {
      if (!active) return;
      setProfileName(profile?.full_name ?? null);
      setProfileRole(profile?.role ?? null);
      setIdentityLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          We need camera access to scan attendance QR codes.
        </Text>
        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera-outline"
          onPress={requestPermission}
        />
      </View>
    );
  }

<<<<<<< HEAD
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLastData(data);

    // Attendance is always recorded for the LOGGED-IN account.
    // Block scans that would record the wrong person.
=======
  const submitPayload = (data: string) => {
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
    if (!user) {
      setMessage('Please log in first. Attendance needs an account.');
      setSuccess(false);
      return;
    }
    if (identityLoading) {
      setMessage('Checking your account... please tap Scan Again.');
      setSuccess(false);
      return;
    }
<<<<<<< HEAD
    if (profileRole === 'teacher') {
      setMessage(
        'Teachers cannot record attendance. Log in with a student account to scan.'
=======
    if (profileRole === 'teacher' || profileRole === 'admin') {
      setMessage(
        'Teachers/admins cannot record attendance. Log in with a student account to scan.'
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
      );
      setSuccess(false);
      return;
    }
<<<<<<< HEAD

    registerAttendance(data, user.id).then((result) => {
      setMessage(result.message);
      setSuccess(result.success);
    });
  };

  const identityLabel = identityLoading
    ? 'Checking account...'
    : profileName ?? user?.email ?? 'Not logged in';
=======
    setBusy(true);
    registerAttendance(data, user.id).then((result) => {
      setBusy(false);
      setMessage(result.message);
      setSuccess(result.success);
      if (result.success) {
        try {
          Vibration.vibrate(80);
        } catch {}
      } else {
        try {
          Vibration.vibrate([0, 60, 60, 60]);
        } catch {}
      }
    });
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLastData(data);
    submitPayload(data);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim() || busy) return;
    const code = manualCode.trim().toUpperCase();
    setScanned(true);
    setLastData(code);
    submitPayload(code);
  };

  const identityLabel = identityLoading
    ? 'Checking account...'
    : (profileName ?? user?.email ?? 'Not logged in');
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
<<<<<<< HEAD
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
=======
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <Pressable
        style={styles.torchBtn}
        onPress={() => setTorch((t) => !t)}
        accessibilityLabel="Toggle flashlight"
      >
        <Ionicons
          name={torch ? 'flashlight' : 'flashlight-outline'}
          size={22}
          color={torch ? '#0B0813' : '#FFFFFF'}
        />
      </Pressable>
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
      <View style={styles.overlay}>
        <View style={styles.identityBar}>
          <Text style={styles.identityLabel}>Scanning as:</Text>
          <Text style={styles.identityName} numberOfLines={1}>
            {identityLabel}
          </Text>
        </View>
        {message ? (
          <View style={styles.card}>
<<<<<<< HEAD
            <Text
              style={[styles.message, success ? styles.ok : styles.fail]}
            >
=======
            <Text style={[styles.message, success ? styles.ok : styles.fail]}>
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
              {message}
            </Text>
            {lastData ? (
              <Text style={styles.raw} numberOfLines={3}>
                {lastData}
              </Text>
            ) : null}
            <AppButton
              theme="primary"
              title="Scan Again"
              icon="refresh-outline"
              onPress={() => {
                setScanned(false);
                setMessage(null);
                setLastData(null);
              }}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.hint}>
              Point the camera at an event QR code
            </Text>
<<<<<<< HEAD
=======
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Or type event code (EVT-...)"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="characters"
                editable={!busy}
                onSubmitEditing={handleManualSubmit}
              />
              <Pressable
                style={[styles.goBtn, (!manualCode.trim() || busy) && styles.goBtnDisabled]}
                onPress={handleManualSubmit}
                disabled={!manualCode.trim() || busy}
              >
                <Text style={styles.goText}>{busy ? '...' : 'Go'}</Text>
              </Pressable>
            </View>
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
<<<<<<< HEAD
=======
  torchBtn: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff33',
    borderWidth: 1,
    borderColor: '#ffffff55',
    alignItems: 'center',
    justifyContent: 'center',
  },
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 10,
  },
  identityBar: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  identityLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorderNeon,
    padding: 16,
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
<<<<<<< HEAD
=======
  manualRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  goBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  goBtnDisabled: {
    opacity: 0.5,
  },
  goText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  message: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  ok: {
    color: COLORS.success,
  },
  fail: {
    color: COLORS.danger,
  },
  raw: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
