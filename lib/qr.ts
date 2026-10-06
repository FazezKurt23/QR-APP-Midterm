export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
<<<<<<< HEAD
};

=======
  /** Random per-event secret. Events created before this feature have none. */
  s?: string;
};

function randomSecret(length = 24): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  // Math.random is enough for a QR anti-share secret (not for auth tokens).
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateQRSecret(): string {
  return randomSecret(32);
}

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
export function buildQRPayload(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
<<<<<<< HEAD
=======
  secret?: string | null;
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
}): string {
  const payload: QRPayload = {
    v: 1,
    event: event.eventId,
  };

  if (event.title) payload.title = event.title;
  if (event.start) payload.start = event.start;
  if (event.end) payload.end = event.end;
<<<<<<< HEAD
=======
  if (event.secret) payload.s = event.secret;
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0

  return JSON.stringify(payload);
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
<<<<<<< HEAD
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
=======
  const trimmed = raw.trim();
  // Manual fallback: allow typing just the event code (e.g. "EVT-2026-0001").
  if (trimmed && !trimmed.startsWith('{')) {
    if (/^[A-Za-z0-9-_]{3,64}$/.test(trimmed)) {
      return { ok: true, payload: { v: 1, event: trimmed.toUpperCase() } };
    }
    return { ok: false, message: 'Invalid QR code.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  } catch {
    return { ok: false, message: 'Invalid QR code.' };
  }

  if (parsed.v !== 1 || typeof parsed.event !== 'string' || !parsed.event) {
    return { ok: false, message: 'Not an attendance QR code.' };
  }

  return { ok: true, payload: parsed as QRPayload };
}
