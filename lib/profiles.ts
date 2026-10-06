import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  student_id: string | null;
  course: string | null;
  year_section: string | null;
  role: Role;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, student_id, course, year_section, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    student_id?: string | null;
    course?: string | null;
    year_section?: string | null;
    role?: Role;
  }
): Promise<{ error: string | null }> {
  // The row is normally created by the on_auth_user_created trigger,
  // but accounts registered BEFORE the schema was run have no row.
  // Upsert instead of update so the name still saves for those users
  // (insert needs the email, taken from the current session).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row: Record<string, unknown> = { id: userId, ...updates };
  if (user?.email) {
    row.email = user.email;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' });

  return { error: error?.message ?? null };
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, student_id, course, year_section, role')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Profile[];
}

export async function setUserRole(
  userId: string,
  role: Role
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  return { error: error?.message ?? null };
}
