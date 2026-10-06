import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';
import StatusPill from '@/components/StatusPill';
import { useAuth } from '@/lib/auth';
import {
  getProfile,
  listProfiles,
  setUserRole,
  type Profile,
  type Role,
} from '@/lib/profiles';
import {
  deleteEvent,
  listAllEvents,
  setEventStatus,
  type CloudEvent,
} from '@/lib/events';
import {
  deleteAttendance,
  getAllAttendance,
  groupAttendanceBySection,
  updateAttendanceStatus,
  type AdminAttendanceRow,
} from '@/lib/attendance';

type Tab = 'users' | 'events' | 'attendance';
type AttendanceView = 'list' | 'section';

export default function AdminScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [records, setRecords] = useState<AdminAttendanceRow[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [attView, setAttView] = useState<AttendanceView>('section');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const me = await getProfile(user.id);
    setRole(me?.role ?? 'student');
    if (me?.role === 'admin') {
      setUsers(await listProfiles());
      setEvents(await listAllEvents());
      setRecords(await getAllAttendance(200, 0));
    }
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
    setVisibleCount(50);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Hooks before early returns — otherwise "more hooks" render error.
  const q = search.trim().toLowerCase();
  const filteredUsers = useMemo(
    () =>
      !q
        ? users
        : users.filter(
            (u) =>
              (u.full_name ?? '').toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              (u.student_id ?? '').toLowerCase().includes(q) ||
              (u.course ?? '').toLowerCase().includes(q)
          ),
    [users, q]
  );
  const filteredEvents = useMemo(
    () =>
      !q
        ? events
        : events.filter(
            (e) =>
              e.title.toLowerCase().includes(q) ||
              e.event_code.toLowerCase().includes(q)
          ),
    [events, q]
  );
  const filteredRecords = useMemo(
    () =>
      !q
        ? records
        : records.filter(
            (r) =>
              r.eventTitle.toLowerCase().includes(q) ||
              (r.studentName ?? '').toLowerCase().includes(q) ||
              (r.studentEmail ?? '').toLowerCase().includes(q) ||
              (r.studentIdNo ?? '').toLowerCase().includes(q)
          ),
    [records, q]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  if (role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="shield-checkmark-outline"
          size={48}
          color={COLORS.textSecondary}
        />
        <Text style={styles.lockTitle}>Admins Only</Text>
        <Text style={styles.muted}>
        </Text>
      </View>
    );
  }

  const cycleRole = (p: Profile) => {
    const next: Role =
      p.role === 'student' ? 'teacher' : p.role === 'teacher' ? 'admin' : 'student';
    Alert.alert('Change role?', `${p.email}: ${p.role} → ${next}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () =>
          setUserRole(p.id, next).then(({ error }) => {
            if (error) Alert.alert('Error', error);
            load();
          }),
      },
    ]);
  };

  const toggleEvent = (ev: CloudEvent) => {
    setEventStatus(ev.id, ev.status === 'open' ? 'closed' : 'open').then(
      ({ error }) => {
        if (error) Alert.alert('Error', error);
        load();
      }
    );
  };

  const removeEvent = (ev: CloudEvent) => {
    Alert.alert('Delete event?', ev.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteEvent(ev.id).then(({ error }) => {
            if (error) Alert.alert('Error', error);
            load();
          }),
      },
    ]);
  };

  const correctStatus = (row: AdminAttendanceRow) => {
    // present → late → absent → present (excused removed per request).
    // Kung ang old record kay excused, sunod pislit mahimong present.
    const order = ['present', 'late', 'absent'] as const;
    const idx = order.indexOf(row.status as (typeof order)[number]);
    const next = idx === -1 ? 'present' : order[(idx + 1) % order.length];
    updateAttendanceStatus(row.id, next).then(
      ({ error }) => {
        if (error) Alert.alert('Error', error);
        load();
      }
    );
  };

  const removeRecord = (row: AdminAttendanceRow) => {
    Alert.alert('Delete record?', `${row.eventTitle} — ${row.studentEmail}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteAttendance(row.id).then(({ error }) => {
            if (error) Alert.alert('Error', error);
            load();
          }),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin Panel</Text>
      <Text style={styles.summary}>
        {users.length} users · {events.length} events · {records.length}{' '}
        attendance rows
      </Text>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setVisibleCount(50);
        }}
        placeholder="Search users, events, attendance..."
        placeholderTextColor={COLORS.muted}
      />

      <View style={styles.tabRow}>
        {(['users', 'events', 'attendance'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => {
              setTab(t);
              setVisibleCount(50);
            }}
          >
            <Text
              style={[styles.tabText, tab === t && styles.tabTextActive]}
            >
              {t.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'users' && (
        <FlatList
          data={filteredUsers.slice(0, visibleCount)}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          onEndReached={() => setVisibleCount((c) => c + 50)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.full_name ?? item.email}
              </Text>
              <Text style={styles.meta}>{item.email}</Text>
              {(item.student_id || item.course || item.year_section) && (
                <Text style={styles.meta}>
                  {[item.student_id, item.course, item.year_section].filter(Boolean).join(' · ')}
                </Text>
              )}
              <View style={styles.row}>
                <Text style={styles.badge}>{item.role.toUpperCase()}</Text>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => cycleRole(item)}
                >
                  <Text style={styles.actionText}>Change role</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {tab === 'events' && (
        <FlatList
          data={filteredEvents.slice(0, visibleCount)}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          onEndReached={() => setVisibleCount((c) => c + 50)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.event_code}</Text>
              <StatusPill status={item.status} />
              {item.venue ? (
                <Text style={styles.meta}>{item.venue}</Text>
              ) : null}
              <View style={styles.row}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => toggleEvent(item)}
                >
                  <Text style={styles.actionText}>
                    {item.status === 'open' ? 'Close' : 'Reopen'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.dangerBtn]}
                  onPress={() => removeEvent(item)}
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

      {tab === 'attendance' && (
        <>
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, attView === 'section' && styles.tabActive]}
              onPress={() => setAttView('section')}
            >
              <Text style={[styles.tabText, attView === 'section' && styles.tabTextActive]}>
                BY SECTION
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, attView === 'list' && styles.tabActive]}
              onPress={() => setAttView('list')}
            >
              <Text style={[styles.tabText, attView === 'list' && styles.tabTextActive]}>
                ALL SCANS
              </Text>
            </Pressable>
          </View>

          {attView === 'section' ? (
            <SectionBreakdown
              events={events}
              records={filteredRecords}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          ) : (
            <FlatList
              data={filteredRecords.slice(0, visibleCount)}
              keyExtractor={(r) => r.id}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
              onEndReached={() => setVisibleCount((c) => c + 50)}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{item.eventTitle}</Text>
                  <Text style={styles.meta}>
                    {item.studentName ?? item.studentEmail}
                    {item.studentIdNo ? ` (${item.studentIdNo})` : ''}
                    {(item.course || item.section)
                      ? ` · ${[item.course, item.section].filter(Boolean).join(' ')}`
                      : ''}
                  </Text>
                  <StatusPill status={item.status} />
                  <Text style={styles.meta}>
                    {new Date(item.scannedAt).toLocaleString()}
                  </Text>
                  <View style={styles.row}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => correctStatus(item)}
                    >
                      <Text style={styles.actionText}>Correct status</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.dangerBtn]}
                      onPress={() => removeRecord(item)}
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
        </>
      )}
    </View>
  );
}

function SectionBreakdown({
  events,
  records,
  selectedEventId,
  onSelectEvent,
  refreshing,
  onRefresh,
}: {
  events: CloudEvent[];
  records: AdminAttendanceRow[];
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const activeEventId = selectedEventId ?? events[0]?.id ?? records[0]?.eventId ?? null;
  const scoped = activeEventId ? records.filter((r) => r.eventId === activeEventId) : records;
  const groups = groupAttendanceBySection(scoped);
  const activeEvent = events.find((e) => e.id === activeEventId);

  return (
    <FlatList
      data={groups}
      keyExtractor={(g) => g.section}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 4 }}>
          <Text style={styles.meta}>Event:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {events.slice(0, 20).map((e) => (
              <Pressable
                key={e.id}
                style={[styles.tab, activeEventId === e.id && styles.tabActive, { flex: 0, paddingHorizontal: 12 }]}
                onPress={() => onSelectEvent(e.id)}
              >
                <Text style={[styles.tabText, activeEventId === e.id && styles.tabTextActive]}>
                  {e.event_code}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.cardTitle}>{activeEvent?.title ?? 'Scans by section'}</Text>
          <Text style={styles.meta}>
            {scoped.length} scanned · {groups.length} blocks
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.muted}>No scans for this event yet.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{item.section}</Text>
            <Text style={styles.badge}>{item.total}</Text>
          </View>
          <Text style={styles.meta}>
            {item.present} present · {item.late} late
            {item.absent ? ` · ${item.absent} absent` : ''}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
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
  },
  summary: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  search: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    marginBottom: 12,
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#8B5CF622',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  list: {
    gap: 10,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
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
});
