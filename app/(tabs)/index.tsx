import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import StatusPill from '@/components/StatusPill';
import { COLORS } from '@/constants/colors';
import { listOpenEvents, type CloudEvent } from '@/lib/events';

export default function HomeScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setEvents(await listOpenEvents());
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <Header title="QR Attendance" />
      </View>

      <View style={styles.content}>
        <Text style={styles.mainTitle}>School Event Attendance</Text>
        <Text style={styles.subtitle}>
          Scan event QR codes to record your attendance instantly.
        </Text>
      </View>

      <View style={styles.buttonStack}>
        <AppButton
          theme="primary"
          title="Scan QR Code"
          icon="qr-code-outline"
          onPress={() => router.push('/(tabs)/scan')}
        />
        <AppButton
          title="Attendance History"
          icon="time-outline"
          onPress={() => router.push('/(tabs)/history')}
        />
      </View>

      <Text style={styles.sectionTitle}>
        Available Events ({events.length})
      </Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="calendar-outline"
              size={40}
              color={COLORS.textSecondary}
            />
            <Text style={styles.empty}>
              No open events right now. Pull to refresh.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.event_code}</Text>
            {item.venue ? (
              <View style={styles.venueRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={COLORS.accent}
                />
                <Text style={styles.meta}>{item.venue}</Text>
              </View>
            ) : null}
            {item.description ? (
              <Text style={styles.meta} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            {item.start_time ? (
              <Text style={styles.meta}>
                {new Date(item.start_time).toLocaleString()}
              </Text>
            ) : null}
            <StatusPill status={item.status} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  headerSection: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 24,
    paddingBottom: 12,
  },
  content: {
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  buttonStack: {
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorderNeon,
    padding: 14,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  empty: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
