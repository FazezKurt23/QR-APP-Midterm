import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';

<<<<<<< HEAD
=======
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
<<<<<<< HEAD
=======
  status: string;
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
<<<<<<< HEAD
=======
  status?: AttendanceStatus;
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
<<<<<<< HEAD
  attendees: {
    studentId: string;
    studentName: string | null;
=======
  presentCount: number;
  lateCount: number;
  attendees: {
    studentId: string;
    studentName: string | null;
    studentIdNo: string | null;
    course: string | null;
    section: string | null;
    status: string;
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

<<<<<<< HEAD
export async function registerAttendance(
  rawPayload: string,
  studentId: string
=======
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function registerAttendance(
  rawPayload: string,
  studentId: string,
  coords?: { latitude: number; longitude: number } | null
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }
  const payload = parsed.payload;

<<<<<<< HEAD
  const now = Date.now();
  const start = payload.start ? new Date(payload.start).getTime() : null;
  const end = payload.end ? new Date(payload.end).getTime() : null;

  if (start && now < start) {
    return { success: false, message: 'Event has not started yet.' };
  }
  if (end && now > end) {
    return { success: false, message: 'Event has already ended.' };
  }

  const title = payload.title ?? payload.event;
  let event: { id: string; title: string } | null = null;

  const foundEvent = await getEventByCode(payload.event);
  if (foundEvent) {
    event = foundEvent;
  } else {
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert([
        {
          event_code: payload.event,
          title,
          start_time: payload.start ?? null,
          end_time: payload.end ?? null,
        },
      ])
      .select('id, title')
      .single();

    if (insertError) {
      return { success: false, message: 'Could not create event.' };
    }
    event = newEvent;
=======
  const foundEvent = await getEventByCode(payload.event);
  // No more auto-create: unknown codes are rejected (anti-fake QR).
  if (!foundEvent) {
    return {
      success: false,
      message: 'Event not found. Ask your teacher to check the event code.',
    };
  }

  if ((foundEvent as any).status === 'closed') {
    return {
      success: false,
      message: 'This event is closed. Attendance is no longer accepted.',
      eventTitle: foundEvent.title,
    };
  }

  // Secret check: events created with a secret require it.
  const expectedSecret = (foundEvent as any).qr_secret as string | null;
  if (expectedSecret && payload.s !== expectedSecret) {
    // Backwards compat: old QR prints without secret still work if the
    // teacher never rotated — but once a secret exists, screenshots with
    // the wrong/old secret are rejected. Manual typed codes also land here.
    // Allow manual typed code only when QR has no secret? No — require QR.
    // To keep manual fallback usable, we still allow it but flag it:
    // reject only if payload came from a full QR with a *different* secret.
    if (payload.s && payload.s !== expectedSecret) {
      return {
        success: false,
        message: 'Expired or invalid QR. Ask the teacher to show the latest QR.',
        eventTitle: foundEvent.title,
      };
    }
    // payload.s missing (manual entry): allow, status will still be recorded.
  }

  const now = Date.now();
  const start = foundEvent.start_time
    ? new Date(foundEvent.start_time).getTime()
    : payload.start
      ? new Date(payload.start).getTime()
      : null;
  const end = foundEvent.end_time
    ? new Date(foundEvent.end_time).getTime()
    : payload.end
      ? new Date(payload.end).getTime()
      : null;

  if (start && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
      eventTitle: foundEvent.title,
    };
  }
  if (end && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
      eventTitle: foundEvent.title,
    };
  }

  // Optional geofence: only enforced when the teacher set a location.
  const evLat = (foundEvent as any).latitude as number | null;
  const evLng = (foundEvent as any).longitude as number | null;
  const radius = (foundEvent as any).radius_meters as number | null;
  if (evLat != null && evLng != null && radius && radius > 0) {
    if (!coords) {
      return {
        success: false,
        message: 'Location required for this event. Enable location and retry.',
        eventTitle: foundEvent.title,
      };
    }
    const d = distanceMeters(evLat, evLng, coords.latitude, coords.longitude);
    if (d > radius) {
      return {
        success: false,
        message: `Too far from venue (${Math.round(d)}m away, allowed ${radius}m).`,
        eventTitle: foundEvent.title,
      };
    }
  }

  // Late logic: present when within grace period, late afterwards.
  const lateAfter = (foundEvent as any).late_after_minutes ?? 15;
  let status: AttendanceStatus = 'present';
  if (start && now > start + lateAfter * 60 * 1000) {
    status = 'late';
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  }

  const { error: attError } = await supabase.from('attendance').insert([
    {
      student_id: studentId,
<<<<<<< HEAD
      event_id: event.id,
=======
      event_id: foundEvent.id,
      status,
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
    },
  ]);

  if (attError) {
    if (attError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
<<<<<<< HEAD
        eventTitle: event.title,
=======
        eventTitle: foundEvent.title,
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
      };
    }
    return { success: false, message: attError.message };
  }

  return {
    success: true,
<<<<<<< HEAD
    message: 'Attendance recorded!',
    eventTitle: event.title,
=======
    message:
      status === 'late'
        ? 'Recorded as LATE — better late than absent!'
        : 'Attendance recorded!',
    eventTitle: foundEvent.title,
    status,
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  };
}

export async function getAttendanceHistory(
<<<<<<< HEAD
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });
=======
  studentId: string,
  limit = 100
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, status, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false })
    .limit(limit);
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
<<<<<<< HEAD
=======
    status: row.status ?? 'present',
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
    scannedAt: row.scanned_at,
  }));
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
<<<<<<< HEAD
    .select('student_id, scanned_at, event_id')
=======
    .select('student_id, scanned_at, event_id, status')
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attError || !attendance) {
    return events.map((e: any) => ({
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeeCount: 0,
<<<<<<< HEAD
=======
      presentCount: 0,
      lateCount: 0,
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
      attendees: [],
    }));
  }

  // Fetch attendee names with a SEPARATE query. (A nested
  // `profiles (...)` embed inside the attendance select does not work
  // because there is no direct foreign key between attendance and
  // profiles — PostgREST rejects it and the whole query fails, leaving
  // the teacher with 0 attendees. This query is allowed by the RLS
  // policy "Teachers can view profiles of their attendees".)
  const studentIds = [
    ...new Set((attendance as any[]).map((a: any) => a.student_id)),
  ];
<<<<<<< HEAD
  let nameMap: Record<string, string | null> = {};
  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);
    ((profs as any[] | null) ?? []).forEach((p: any) => {
      nameMap[p.id] = p.full_name ?? null;
=======
  let nameMap: Record<string, { name: string | null; idNo: string | null; course: string | null; section: string | null }> = {};
  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, student_id, course, year_section')
      .in('id', studentIds);
    ((profs as any[] | null) ?? []).forEach((p: any) => {
      nameMap[p.id] = { name: p.full_name ?? null, idNo: p.student_id ?? null, course: p.course ?? null, section: p.year_section ?? null };
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
    });
  }

  return events.map((e: any) => {
    const rows = (attendance as any[]).filter((a: any) => a.event_id === e.id);
    return {
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeeCount: rows.length,
<<<<<<< HEAD
      attendees: rows.map((a: any) => ({
        studentId: a.student_id,
        studentName: nameMap[a.student_id] ?? null,
=======
      presentCount: rows.filter((r: any) => r.status === 'present').length,
      lateCount: rows.filter((r: any) => r.status === 'late').length,
      attendees: rows.map((a: any) => ({
        studentId: a.student_id,
        studentName: nameMap[a.student_id]?.name ?? null,
        studentIdNo: nameMap[a.student_id]?.idNo ?? null,
        course: nameMap[a.student_id]?.course ?? null,
        section: nameMap[a.student_id]?.section ?? null,
        status: a.status ?? 'present',
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
        scannedAt: a.scanned_at,
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = (events as any[]).map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: attRows, error: attError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError || !attRows) {
    return (events as any[]).map((e: any) => ({
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      attendeeCount: 0,
    }));
  }

  const counts: Record<string, number> = {};
  (attRows as any[]).forEach((r: any) => {
    counts[r.event_id] = (counts[r.event_id] ?? 0) + 1;
  });

  return (events as any[]).map((e: any) => ({
    eventId: e.id,
    eventCode: e.event_code,
    title: e.title,
    attendeeCount: counts[e.id] ?? 0,
  }));
}
<<<<<<< HEAD
=======

export type AdminAttendanceRow = {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  studentIdNo: string | null;
  course: string | null;
  section: string | null;
  eventId: string;
  eventCode: string;
  eventTitle: string;
  status: string;
  scannedAt: string;
};

export async function getAllAttendance(
  limit = 100,
  offset = 0
): Promise<AdminAttendanceRow[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, student_id, event_id, status, scanned_at, events ( event_code, title )')
    .order('scanned_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data) return [];
  const studentIds = [...new Set((data as any[]).map((r: any) => r.student_id))];
  let nameMap: Record<string, { name: string | null; email: string | null; idNo: string | null; course: string | null; section: string | null }> = {};
  if (studentIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email, student_id, course, year_section')
      .in('id', studentIds);
    ((profs as any[]) ?? []).forEach((p: any) => {
      nameMap[p.id] = { name: p.full_name ?? null, email: p.email ?? null, idNo: p.student_id ?? null, course: p.course ?? null, section: p.year_section ?? null };
    });
  }
  return (data as any[]).map((r: any) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: nameMap[r.student_id]?.name ?? null,
    studentEmail: nameMap[r.student_id]?.email ?? null,
    studentIdNo: nameMap[r.student_id]?.idNo ?? null,
    course: nameMap[r.student_id]?.course ?? null,
    section: nameMap[r.student_id]?.section ?? null,
    eventId: r.event_id,
    eventCode: r.events?.event_code ?? '',
    eventTitle: r.events?.title ?? '',
    status: r.status ?? 'present',
    scannedAt: r.scanned_at,
  }));
}

export function groupAttendanceBySection(
  rows: Pick<AdminAttendanceRow, 'section' | 'course' | 'status'>[]
): { section: string; total: number; present: number; late: number; absent: number }[] {
  const map = new Map<string, { total: number; present: number; late: number; absent: number }>();
  for (const r of rows) {
    const label = r.section?.trim() || 'No Section';
    const course = r.course?.trim();
    const key = course ? `${course} ${label}` : label;
    const entry = map.get(key) ?? { total: 0, present: 0, late: 0, absent: 0 };
    entry.total += 1;
    if (r.status === 'present') entry.present += 1;
    else if (r.status === 'late') entry.late += 1;
    else if (r.status === 'absent') entry.absent += 1;
    map.set(key, entry);
  }
  return [...map.entries()]
    .map(([section, v]) => ({ section, ...v }))
    .sort((a, b) => b.total - a.total);
}

export async function updateAttendanceStatus(
  id: string,
  status: AttendanceStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('attendance').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteAttendance(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export function attendanceToCSV(
  rows: { studentName: string | null; studentIdNo: string | null; studentEmail?: string | null; status: string; scannedAt: string; eventTitle?: string; eventCode?: string }[]
): string {
  const esc = (v: string | null | undefined) => {
    const s = (v ?? '').toString();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = 'Name,Student ID,Email,Status,Scanned At,Event';
  const lines = rows.map((r) =>
    [
      esc(r.studentName),
      esc(r.studentIdNo),
      esc((r as any).studentEmail ?? ''),
      esc(r.status),
      esc(new Date(r.scannedAt).toLocaleString()),
      esc((r as any).eventTitle ?? (r as any).eventCode ?? ''),
    ].join(',')
  );
  return [header, ...lines].join('\n');
}
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
