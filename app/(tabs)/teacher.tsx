import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import StatusPill from '@/components/StatusPill';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  createEvent,
  deleteEvent,
  getEventsByTeacher,
  setEventStatus,
  updateEvent,
  type CloudEvent,
} from '@/lib/events';
import { getTeacherEventSummary } from '@/lib/attendance';
import { buildQRPayload } from '@/lib/qr';

export default function TeacherScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [payloadEvent, setPayloadEvent] = useState<CloudEvent | null>(null);
  const [fullscreenQR, setFullscreenQR] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<CloudEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lateAfter, setLateAfter] = useState('15');
  const [searchQuery, setSearchQuery] = useState('');

  const loadMine = useCallback(async () => {
    if (!user) return;
    setMyEvents(await getEventsByTeacher(user.id));
    const summary = await getTeacherEventSummary(user.id);
    const map: Record<string, number> = {};
    summary.forEach((s) => {
      map[s.eventId] = s.attendeeCount;
    });
    setCounts(map);
  }, [user]);

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
      loadMine();
      return () => {
        active = false;
      };
    }, [user, loadMine])
  );

  // NOTE: hooks must stay before any early return, otherwise
  // "Rendered more hooks than during the previous render".
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return myEvents;
    return myEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.event_code.toLowerCase().includes(query) ||
        (e.venue ?? '').toLowerCase().includes(query)
    );
  }, [myEvents, searchQuery]);

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher' && role !== 'admin') {
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
      setEditingPart('date');
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

  const resetForm = () => {
    setTitle('');
    setEventId('');
    setVenue('');
    setDescription('');
    setLateAfter('15');
    setEditingId(null);
    setPayload(null);
    setPayloadEvent(null);
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
    const lateMinutes = Math.max(0, parseInt(lateAfter, 10) || 0);
    if (editingId) {
      // Edit existing event (title/venue/description/times/late window).
      updateEvent(editingId, {
        title: title.trim(),
        venue: venue.trim() || null,
        description: description.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        late_after_minutes: lateMinutes,
      })
        .then(({ error }) => {
          if (error) {
            setMessage(`Could not update: ${error}`);
            return;
          }
          setMessage('Event updated!');
          resetForm();
          loadMine();
        })
        .catch((e) => setMessage(`Could not update: ${e?.message ?? e}`));
      return;
    }
    const eventData = {
      eventId: eventId.trim().toUpperCase(),
      title: title.trim(),
      venue: venue.trim(),
      description: description.trim(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      lateAfterMinutes: lateMinutes,
    };
    createEvent(eventData)
      .then(({ error, secret }) => {
        if (error) {
          setMessage(`Could not save: ${error}`);
          return;
        }
        setMessage(
          'Event saved! Show the QR below — it contains a secret so screenshots from old events will not work.'
        );
        try {
          setPayload(buildQRPayload({ ...eventData, secret }));
        } catch (e: any) {
          setMessage(`Event saved but QR failed: ${e?.message ?? e}`);
          return;
        }
        setPayloadEvent(null);
        loadMine();
      })
      .catch((e) => setMessage(`Could not save: ${e?.message ?? e}`));
  };

  const startEdit = (ev: CloudEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setEventId(ev.event_code);
    setVenue(ev.venue ?? '');
    setDescription(ev.description ?? '');
    setLateAfter(String(ev.late_after_minutes ?? 15));
    if (ev.start_time) setStartDate(new Date(ev.start_time));
    if (ev.end_time) setEndDate(new Date(ev.end_time));
    setPayload(
      buildQRPayload({
        eventId: ev.event_code,
        title: ev.title,
        start: ev.start_time ?? undefined,
        end: ev.end_time ?? undefined,
        secret: ev.qr_secret ?? undefined,
      })
    );
    setPayloadEvent(ev);
    setMessage(`Editing ${ev.event_code}. Event code cannot be changed.`);
  };

  const showQR = (ev: CloudEvent) => {
    setPayload(
      buildQRPayload({
        eventId: ev.event_code,
        title: ev.title,
        start: ev.start_time ?? undefined,
        end: ev.end_time ?? undefined,
        secret: ev.qr_secret ?? undefined,
      })
    );
    setPayloadEvent(ev);
  };

  const handleShareQR = async () => {
    if (!payload) return;
    try {
      await Share.share({
        message: `Attendance QR for ${payloadEvent?.title ?? 'event'}: ${payload}`,
      });
    } catch {}
  };

  const handleToggleStatus = (ev: CloudEvent) => {
    const next = ev.status === 'open' ? 'closed' : 'open';
    setEventStatus(ev.id, next).then(({ error }) => {
      if (error) Alert.alert('Error', error);
      loadMine();
    });
  };

  const handleDelete = (ev: CloudEvent) => {
    Alert.alert('Delete event?', `${ev.title} (${ev.event_code})`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteEvent(ev.id).then(({ error }) => {
            if (error) Alert.alert('Error', error);
            if (editingId === ev.id) resetForm();
            loadMine();
          }),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>
        {editingId ? 'Edit Event' : 'Create Event'}
      </Text>

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
        editable={!editingId}
      />

      <Text style={styles.label}>Venue</Text>
      <TextInput
        style={styles.input}
        value={venue}
        onChangeText={setVenue}
        placeholder="Gymnasium"
        placeholderTextColor={COLORS.muted}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="What is this event about?"
        placeholderTextColor={COLORS.muted}
        multiline
      />

      <Text style={styles.label}>Late After (minutes, 0 = no late)</Text>
      <TextInput
        style={styles.input}
        value={lateAfter}
        onChangeText={setLateAfter}
        placeholder="15"
        placeholderTextColor={COLORS.muted}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Start Time</Text>
      <Pressable
        style={styles.input}
        onPress={() => {
          setEditTarget('start');
          setEditingPart('date');
        }}
      >
        <Text style={styles.inputText}>{startDate.toLocaleString()}</Text>
      </Pressable>

      <Text style={styles.label}>End Time</Text>
      <Pressable
        style={styles.input}
        onPress={() => {
          setEditTarget('end');
          setEditingPart('date');
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
        <Text style={styles.primaryButtonText}>
          {editingId ? 'Save Changes' : 'Create & Generate QR'}
        </Text>
      </Pressable>
      {editingId ? (
        <Pressable style={styles.secondaryButton} onPress={resetForm}>
          <Text style={styles.secondaryButtonText}>Cancel Editing</Text>
        </Pressable>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {payload ? (
        <View style={styles.qrCard}>
          <QRCode value={payload} size={200} />
          <Text style={styles.payloadText} numberOfLines={2}>
            {payloadEvent ? `${payloadEvent.title} (${payloadEvent.event_code})` : 'New event QR'}
          </Text>
          <View style={styles.qrActions}>
            <Pressable style={styles.qrActionBtn} onPress={() => setFullscreenQR(true)}>
              <Text style={styles.qrActionText}>Fullscreen</Text>
            </Pressable>
            <Pressable style={styles.qrActionBtn} onPress={handleShareQR}>
              <Text style={styles.qrActionText}>Share</Text>
            </Pressable>
          </View>
          <Text style={[styles.payloadText, { fontSize: 11 }]} numberOfLines={3}>
            {payload}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.heading, { marginTop: 28 }]}>
        My Events ({filteredEvents.length})
      </Text>
      <TextInput
        style={[styles.input, { marginBottom: 12 }]}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search events..."
        placeholderTextColor={COLORS.muted}
      />
      {filteredEvents.length === 0 ? (
        <Text style={styles.muted}>
          {myEvents.length === 0 ? 'No events yet. Create one above.' : 'No match for search.'}
        </Text>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {counts[item.id] ?? 0}
                  </Text>
                </View>
              </View>
              <Text style={styles.muted}>{item.event_code}</Text>
              <StatusPill status={item.status} />
              {item.venue ? (
                <Text style={styles.muted}>{item.venue}</Text>
              ) : null}
              <View style={styles.eventActions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => startEdit(item)}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => handleToggleStatus(item)}
                >
                  <Text style={styles.actionText}>
                    {item.status === 'open' ? 'Close' : 'Reopen'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => showQR(item)}
                >
                  <Text style={styles.actionText}>Show QR</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.dangerBtn]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={[styles.actionText, styles.dangerText]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={fullscreenQR && !!payload} transparent animationType="fade">
        <View style={styles.fullscreenWrap}>
          <View style={styles.fullscreenCard}>
            <Text style={styles.fullscreenTitle}>
              {payloadEvent?.title ?? 'Event QR'}
            </Text>
            <Text style={styles.muted}>{payloadEvent?.event_code ?? ''}</Text>
            {payload ? <QRCode value={payload} size={280} /> : null}
            <View style={styles.qrActions}>
              <Pressable style={styles.qrActionBtn} onPress={handleShareQR}>
                <Text style={styles.qrActionText}>Share</Text>
              </Pressable>
              <Pressable
                style={[styles.qrActionBtn, styles.dangerBtn]}
                onPress={() => setFullscreenQR(false)}
              >
                <Text style={[styles.qrActionText, styles.dangerText]}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
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
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 15,
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
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  countText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dangerBtn: {
    borderColor: COLORS.danger,
  },
  dangerText: {
    color: COLORS.danger,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  // QR card is white, so buttons need dark bg + dark text (not white-on-white).
  qrActionBtn: {
    backgroundColor: '#0B0813',
    borderWidth: 1,
    borderColor: '#0B0813',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  qrActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullscreenWrap: {
    flex: 1,
    backgroundColor: '#000000DD',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fullscreenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
});
