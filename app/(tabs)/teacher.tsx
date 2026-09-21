import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { createEvent } from '@/lib/events';
import { buildQRPayload } from '@/lib/qr';

export default function TeacherScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        setRoleLoading(false);
        return () => {
          active = false;
        };
      }
      setRoleLoading(true);
      getProfile(user.id).then((profile) => {
        if (!active) return;
        setRole(profile?.role ?? 'student');
        setRoleLoading(false);
      });
      return () => {
        active = false;
      };
    }, [user])
  );

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color={COLORS.textSecondary}
        />
        <Text style={styles.lockTitle}>Teachers Only</Text>
        <Text style={styles.muted}>
          Only teacher accounts can create events.
        </Text>
      </View>
    );
  }

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (event.type === 'dismissed') {
      setEditTarget(null);
      return;
    }
    if (selected) {
      if (editTarget === 'start') setStartDate(selected);
      if (editTarget === 'end') setEndDate(selected);
    }
    if (Platform.OS === 'android' && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const applyQuickDuration = (minutes: number) => {
    setEndDate(new Date(startDate.getTime() + minutes * 60 * 1000));
  };

  const handleCreateEvent = () => {
    setMessage(null);
    if (!title.trim() || !eventId.trim()) {
      setMessage('Event title and code are required.');
      return;
    }
    if (startDate >= endDate) {
      setMessage('Start time must be before end time.');
      return;
    }
    const eventData = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
    createEvent(eventData).then(({ error }) => {
      if (error) {
        setMessage('Could not save the event. Please try again.');
        return;
      }
      setMessage(
        'Event saved! Ask a student to scan the QR with their own student account to test it.'
      );
      setPayload(buildQRPayload(eventData));
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Create Event</Text>

      <Text style={styles.label}>Event Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Founders Day Assembly"
        placeholderTextColor={COLORS.muted}
      />

      <Text style={styles.label}>Event Code</Text>
      <TextInput
        style={styles.input}
        value={eventId}
        onChangeText={setEventId}
        placeholder="EVT-2026-0001"
        placeholderTextColor={COLORS.muted}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Start Time</Text>
      <Pressable
        style={styles.input}
        onPress={() => {
          setEditTarget('start');
          setEditingPart(Platform.OS === 'android' ? 'date' : 'date');
        }}
      >
        <Text style={styles.inputText}>{startDate.toLocaleString()}</Text>
      </Pressable>

      <Text style={styles.label}>End Time</Text>
      <Pressable
        style={styles.input}
        onPress={() => {
          setEditTarget('end');
          setEditingPart(Platform.OS === 'android' ? 'date' : 'date');
        }}
      >
        <Text style={styles.inputText}>{endDate.toLocaleString()}</Text>
      </Pressable>

      {editTarget && (
        <DateTimePicker
          value={editTarget === 'start' ? startDate : endDate}
          mode={Platform.OS === 'android' ? editingPart : 'datetime'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      )}

      <View style={styles.chipRow}>
        <Pressable
          style={styles.chip}
          onPress={() => applyQuickDuration(30)}
        >
          <Text style={styles.chipText}>+30 min</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => applyQuickDuration(60)}
        >
          <Text style={styles.chipText}>+1 hour</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => applyQuickDuration(120)}
        >
          <Text style={styles.chipText}>+2 hours</Text>
        </Pressable>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleCreateEvent}>
        <Text style={styles.primaryButtonText}>Create & Generate QR</Text>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {payload ? (
        <View style={styles.qrCard}>
          <QRCode value={payload} size={200} />
          <Text style={styles.payloadText}>{payload}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  muted: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color:COLORS.textPrimary,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: '#A78BFA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  qrCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorderNeon,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#D946EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  payloadText: {
    fontSize: 12,
    color: '#4B5563',
  },
});
