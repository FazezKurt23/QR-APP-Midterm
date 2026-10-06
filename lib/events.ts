import { supabase } from './supabase';
<<<<<<< HEAD
=======
import { generateQRSecret } from './qr';
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
<<<<<<< HEAD
};

=======
  description?: string;
  venue?: string;
  lateAfterMinutes?: number;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
};

export type EventStatus = 'open' | 'closed';

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
<<<<<<< HEAD
  start_time: string | null;
  end_time: string | null;
=======
  description: string | null;
  venue: string | null;
  status: EventStatus;
  start_time: string | null;
  end_time: string | null;
  qr_secret: string | null;
  late_after_minutes: number;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  created_by: string | null;
  created_at: string;
};

export async function createEvent(
  event: Event
<<<<<<< HEAD
): Promise<{ error: string | null }> {
=======
): Promise<{ error: string | null; secret?: string }> {
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  const {
    data: { user },
  } = await supabase.auth.getUser();

<<<<<<< HEAD
  const { error } = await supabase.from('events').upsert(
    {
      event_code: event.eventId,
      title: event.title,
      start_time: event.start || null,
      end_time: event.end || null,
      created_by: user?.id ?? null,
    },
    { onConflict: 'event_code' }
  );

  return { error: error?.message ?? null };
}

=======
  const secret = generateQRSecret();
  const normalizedCode = event.eventId.trim().toUpperCase();

  // Bawal ang duplicate: check una kung naa na'y same event_code.
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('event_code', normalizedCode)
    .maybeSingle();
  if (existing) {
    return { error: `Event code "${normalizedCode}" naa na. Pag-gamit ug lain nga code.` };
  }

  const fullRow = {
    event_code: normalizedCode,
    title: event.title,
    description: event.description?.trim() || null,
    venue: event.venue?.trim() || null,
    status: 'open',
    start_time: event.start || null,
    end_time: event.end || null,
    qr_secret: secret,
    late_after_minutes: event.lateAfterMinutes ?? 15,
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    radius_meters: event.radiusMeters ?? 0,
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from('events').insert(fullRow);

  // Race case: duha ka teacher dungan nag-create ug same code.
  if (error && (error.code === '23505' || /duplicate|unique|already exists/i.test(error.message))) {
    return { error: `Event code "${normalizedCode}" naa na. Pag-gamit ug lain nga code.` };
  }

  // Fallback for DBs where schema.sql hasn't been re-run yet
  // (missing qr_secret / late_after_minutes columns).
  if (
    error &&
    /qr_secret|late_after_minutes|latitude|longitude|radius_meters/i.test(
      error.message
    )
  ) {
    const { event_code, title, description, venue, status, start_time, end_time, created_by } =
      fullRow;
    const { error: retryError } = await supabase.from('events').insert(
      { event_code, title, description, venue, status, start_time, end_time, created_by }
    );
    if (retryError) {
      if (
        retryError.code === '23505' ||
        /duplicate|unique|already exists/i.test(retryError.message)
      ) {
        return { error: `Event code "${normalizedCode}" naa na. Pag-gamit ug lain nga code.` };
      }
      return {
        error: `${retryError.message} — I-run ang bag-ong supabase/schema.sql sa Supabase SQL Editor.`,
      };
    }
    return { error: null, secret: undefined };
  }

  if (error && /row-level security|RLS|policy/i.test(error.message)) {
    return {
      error: `${error.message} — check RLS: teacher must be logged in, or re-run schema.sql.`,
    };
  }

  return { error: error?.message ?? null, secret: error ? undefined : secret };
}

export async function rotateEventSecret(
  id: string
): Promise<{ error: string | null; secret?: string }> {
  const secret = generateQRSecret();
  const { error } = await supabase
    .from('events')
    .update({ qr_secret: secret })
    .eq('id', id);
  return { error: error?.message ?? null, secret: error ? undefined : secret };
}

export async function updateEvent(
  id: string,
  updates: Partial<
    Pick<
      CloudEvent,
      | 'title'
      | 'description'
      | 'venue'
      | 'start_time'
      | 'end_time'
      | 'late_after_minutes'
      | 'latitude'
      | 'longitude'
      | 'radius_meters'
    >
  >
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

export async function setEventStatus(
  id: string,
  status: EventStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function listOpenEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'open')
    .order('start_time', { ascending: true });
  if (error || !data) return [];
  // Home: tago ang expired. Visible ra kung walay end_time o wala pa milapas sa end.
  const now = Date.now();
  return (data as CloudEvent[]).filter((e) => {
    if (!e.end_time) return true;
    return new Date(e.end_time).getTime() >= now;
  });
}

export async function listAllEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as CloudEvent[];
}

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}
