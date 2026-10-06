import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftStudentId, setDraftStudentId] = useState('');
  const [draftCourse, setDraftCourse] = useState('');
  const [draftYearSection, setDraftYearSection] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const p = await getProfile(user.id);
    setProfile(p);
    setDraftName(p?.full_name ?? '');
    setDraftStudentId(p?.student_id ?? '');
    setDraftCourse(p?.course ?? '');
    setDraftYearSection(p?.year_section ?? '');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const isStudent = profile?.role === 'student';
    const { error } = await updateProfile(user.id, {
      full_name: draftName.trim(),
      // Student-only fields: dili apilon kung teacher/admin.
      ...(isStudent
        ? {
            student_id: draftStudentId.trim() || null,
            course: draftCourse.trim() || null,
            year_section: draftYearSection.trim() || null,
          }
        : {}),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      // Re-read from the cloud so the screen always shows the saved value,
      // even for accounts whose profile row did not exist before.
      await loadProfile();
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      {profile?.role === 'teacher' ? (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Teacher</Text>
        </View>
      ) : profile?.role === 'admin' ? (
        <View style={[styles.roleBadge, styles.roleBadgeAdmin]}>
          <Text style={styles.roleBadgeText}>Admin</Text>
        </View>
      ) : (
        <View style={[styles.roleBadge, styles.roleBadgeStudent]}>
          <Text style={styles.roleBadgeTextDark}>Student</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.label}>Name</Text>
        {editing ? (
          <View style={{ gap: 10 }}>
            <View>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Your name"
                placeholderTextColor="#9AA0B4"
                selectionColor={COLORS.accent}
                editable={!saving}
              />
            </View>
            {profile?.role === 'student' && (
              <>
                <View>
                  <Text style={styles.label}>Student ID</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={draftStudentId}
                    onChangeText={setDraftStudentId}
                    placeholder="Student ID (e.g. 2021-00001)"
                    placeholderTextColor="#9AA0B4"
                    selectionColor={COLORS.accent}
                    editable={!saving}
                  />
                </View>
                <View>
                  <Text style={styles.label}>Course</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={draftCourse}
                    onChangeText={setDraftCourse}
                    placeholder="Course (e.g. BSIT)"
                    placeholderTextColor="#9AA0B4"
                    selectionColor={COLORS.accent}
                    editable={!saving}
                  />
                </View>
                <View>
                  <Text style={styles.label}>Year & Section</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={draftYearSection}
                    onChangeText={setDraftYearSection}
                    placeholder="Year & Section (e.g. 3-A)"
                    placeholderTextColor="#9AA0B4"
                    selectionColor={COLORS.accent}
                    editable={!saving}
                  />
                </View>
              </>
            )}
            <View style={styles.nameEditRow}>
              <Pressable
                style={[styles.saveButton, { backgroundColor: 'transparent' }]}
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text style={[styles.saveText, { color: COLORS.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={handleSaveName}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
            <Text style={styles.value}>
              {profile?.full_name || 'Tap to add your name'}
            </Text>
            <Text style={styles.editHint}>Edit</Text>
          </Pressable>
        )}
        {!editing && profile?.role === 'student' && (
          <>
            <Text style={styles.label}>Student ID</Text>
            <Text style={styles.value}>{profile?.student_id || '—'}</Text>
            <Text style={styles.label}>Course</Text>
            <Text style={styles.value}>{profile?.course || '—'}</Text>
            <Text style={styles.label}>Year & Section</Text>
            <Text style={styles.value}>{profile?.year_section || '—'}</Text>
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? profile?.email}</Text>

        <Text style={styles.label}>User ID</Text>
        <Text style={styles.valueSmall}>{user?.id}</Text>
      </View>

      {saving && (
        <ActivityIndicator color={COLORS.primary} style={{ marginBottom: 8 }} />
      )}

      <AppButton
        title="Sign Out"
        icon="log-out-outline"
        onPress={handleSignOut}
        disabled={signingOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  roleBadgeStudent: {
    backgroundColor: COLORS.accent,
    shadowColor: '#06B6D4',
  },
  roleBadgeAdmin: {
    backgroundColor: COLORS.warning,
    shadowColor: '#FBBF24',
  },
  roleBadgeText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  roleBadgeTextDark: {
    color: '#0B0813',
    fontWeight: '700',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorderNeon,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editHint: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  nameEditRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#221A38',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#A78BFA',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
  saveText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
