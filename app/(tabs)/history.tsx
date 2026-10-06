import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '@/constants/colors';
import StatusPill from '@/components/StatusPill';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getAllAttendance,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type AdminAttendanceRow,
  type TeacherEventAttendance,
} from '@/lib/attendance';

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

const STATUS_FILTERS = ['all', 'present', 'late', 'absent',] as const;

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [adminRows, setAdminRows] = useState<AdminAttendanceRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';
      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setStudentRecords([]);
        setAdminRows([]);
      } else if (currentRole === 'admin') {
        const rows = await getAllAttendance(100, 0);
        setAdminRows(rows);
        setTeacherEvents([]);
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id, 200);
        setStudentRecords(records);
        setTeacherEvents([]);
        setAdminRows([]);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const q = search.trim().toLowerCase();
  const matchStatus = (s: string) => statusFilter === 'all' || s.toLowerCase() === statusFilter;

  const filteredStudent = useMemo(
    () =>
      studentRecords.filter(
        (r) =>
          matchStatus(r.status) &&
          (!q ||
            r.eventTitle.toLowerCase().includes(q) ||
            r.eventId.toLowerCase().includes(q))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studentRecords, search, statusFilter]
  );

  const filteredAdmin = useMemo(
    () =>
      adminRows.filter(
        (r) =>
          matchStatus(r.status) &&
          (!q ||
            r.eventTitle.toLowerCase().includes(q) ||
            (r.studentName ?? '').toLowerCase().includes(q) ||
            (r.studentEmail ?? '').toLowerCase().includes(q) ||
            (r.studentIdNo ?? '').toLowerCase().includes(q))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminRows, search, statusFilter]
  );

  const filteredTeacher = useMemo(() => {
    if (!q) return teacherEvents;
    return teacherEvents.filter(
      (e) => e.title.toLowerCase().includes(q) || e.eventCode.toLowerCase().includes(q)
    );
  }, [teacherEvents, q]);

  const presentCount = studentRecords.filter((r) => r.status === 'present').length;
  const lateCount = studentRecords.filter((r) => r.status === 'late').length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading records...</Text>
      </View>
    );
  }

  const renderFilters = (showStatus = true) => (
    <View style={{ gap: 8, marginBottom: 4 }}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search..."
        placeholderTextColor={COLORS.muted}
      />
      {showStatus ? (
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  if (role === 'teacher') {
    if (teacherEvents.length === 0) {
      return (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.title}>No events yet</Text>
          <Text style={styles.muted}>Create an event in the Manage tab to see attendance here.</Text>
        </View>
      );
    }
    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filteredTeacher}
        keyExtractor={(item) => item.eventId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListHeaderComponent={renderFilters(false)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.attendeeCount}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.eventCode} · {item.presentCount} present · {item.lateCount} late
            </Text>
            {item.startTime ? (
              <Text style={styles.meta}>{new Date(item.startTime).toLocaleString()}</Text>
            ) : null}
            {item.attendees.length === 0 ? (
              <Text style={styles.muted}>No scans yet.</Text>
            ) : (
              item.attendees.map((a) => (
                <View key={a.studentId} style={styles.attendeeRow}>
                  <Text style={styles.attendeeName}>
                    {a.studentName ?? shortId(a.studentId)}
                    {a.studentIdNo ? ` (${a.studentIdNo})` : ''} · {a.status.toUpperCase()}
                  </Text>
                  <Text style={styles.meta}>{new Date(a.scannedAt).toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        )}
      />
    );
  }

  if (role === 'admin') {
    if (adminRows.length === 0) {
      return (
        <View style={styles.centered}>
          <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.title}>No attendance yet</Text>
          <Text style={styles.muted}>
            Overall system attendance will appear here. For corrections, use the Admin tab.
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filteredAdmin}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListHeaderComponent={renderFilters(true)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.eventTitle}</Text>
            <Text style={styles.meta}>
              {item.studentName ?? item.studentEmail ?? shortId(item.studentId)}
              {item.studentIdNo ? ` (${item.studentIdNo})` : ''}
            </Text>
            <StatusPill status={item.status} />
            <Text style={styles.meta}>{new Date(item.scannedAt).toLocaleString()}</Text>
          </View>
        )}
      />
    );
  }

  if (studentRecords.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="qr-code-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.title}>No records yet</Text>
        <Text style={styles.muted}>Scan an event QR code to record your attendance.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={filteredStudent}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 4 }}>
          <Text style={styles.meta}>
            {studentRecords.length} events · {presentCount} present · {lateCount} late
          </Text>
          {renderFilters(true)}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.eventTitle}</Text>
          <Text style={styles.meta}>{item.eventId}</Text>
          <StatusPill status={item.status} />
          <Text style={styles.meta}>{new Date(item.scannedAt).toLocaleString()}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, gap: 12 },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorderNeon,
    padding: 16,
    gap: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: { color: COLORS.textOnPrimary, fontWeight: '700', fontSize: 14 },
  meta: { fontSize: 13, color: COLORS.textSecondary },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  muted: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  attendeeRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  attendeeName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  search: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: '#8B5CF622' },
  chipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.textPrimary },
});
