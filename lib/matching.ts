import { supabase } from './supabase';
import type { Profile } from '../types/database';

const FIELD_GROUPS: string[][] = [
  ['computer science', 'software engineering', 'engineering', 'mathematics', 'physics', 'data science', 'information technology', 'cybersecurity', 'robotics'],
  ['design', 'ux design', 'graphic design', 'product design', 'architecture', 'fine arts', 'fashion', 'animation', 'motion design'],
  ['business', 'economics', 'finance', 'marketing', 'management', 'entrepreneurship', 'mba', 'accounting', 'supply chain'],
  ['psychology', 'sociology', 'political science', 'philosophy', 'journalism', 'communications', 'media', 'international relations'],
  ['medicine', 'healthcare', 'biology', 'chemistry', 'nursing', 'pharmacy', 'neuroscience', 'public health'],
  ['law', 'legal studies', 'criminology'],
];

function getMajorGroup(major: string): number {
  const lower = major.toLowerCase();
  for (let i = 0; i < FIELD_GROUPS.length; i++) {
    if (FIELD_GROUPS[i].some((f) => lower.includes(f))) return i;
  }
  return -1;
}

function scoreCandidate(
  user: Profile,
  candidate: Profile,
): { score: number; reason: string } {
  const userInterests: string[] = user.interests ?? [];
  const candidateInterests: string[] = candidate.interests ?? [];

  // 1. Shared interests: 40%
  const shared = userInterests.filter((i) => candidateInterests.includes(i));
  const interestScore = Math.min((shared.length / 3) * 40, 40);

  // 2. Major similarity: 25%
  const userMajor = (user.major ?? '').trim();
  const candidateMajor = (candidate.major ?? '').trim();
  let majorScore = 0;
  if (userMajor && candidateMajor) {
    const sameExact = userMajor.toLowerCase() === candidateMajor.toLowerCase();
    const uGroup = getMajorGroup(userMajor);
    const cGroup = getMajorGroup(candidateMajor);
    const related = uGroup !== -1 && uGroup === cGroup && !sameExact;
    majorScore = sameExact ? 25 : related ? 12.5 : 0;
  }

  // 3. Geographic proximity: 20%
  const userCity = (user.city ?? '').toLowerCase().trim();
  const userCountry = (user.country ?? '').toLowerCase().trim();
  const candidateCity = (candidate.city ?? '').toLowerCase().trim();
  const candidateCountry = (candidate.country ?? '').toLowerCase().trim();
  let geoScore = 0;
  const sameCity = userCity && candidateCity && userCity === candidateCity;
  const sameCountry = userCountry && candidateCountry && userCountry === candidateCountry;
  if (sameCity) geoScore = 20;
  else if (sameCountry) geoScore = 10;

  // 4. Complementary skills: 15% — different major, overlapping interests
  const differentMajor = userMajor.toLowerCase() !== candidateMajor.toLowerCase();
  const complementaryScore = differentMajor && shared.length > 0 ? 15 : 0;

  const total = interestScore + majorScore + geoScore + complementaryScore;

  // Build human-readable reason
  const parts: string[] = [];
  if (shared.length > 0) parts.push(`${shared.length} shared interest${shared.length > 1 ? 's' : ''}`);
  if (sameCity) parts.push('same city');
  else if (sameCountry) parts.push('same country');
  if (userMajor && candidateMajor) {
    if (userMajor.toLowerCase() === candidateMajor.toLowerCase()) parts.push('same major');
    else if (majorScore > 0) parts.push('similar field');
  }

  const reason = parts.length > 0 ? parts.join(', ') : 'potential new connection';
  return { score: total, reason };
}

async function buildExcludeSet(userId: string): Promise<Set<string>> {
  const [connRes, reqRes] = await Promise.all([
    supabase
      .from('connections')
      .select('user_a, user_b')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`),
    supabase
      .from('connection_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending'),
  ]);

  const exclude = new Set<string>();
  connRes.data?.forEach((c) => exclude.add(c.user_a === userId ? c.user_b : c.user_a));
  reqRes.data?.forEach((r) => exclude.add(r.sender_id === userId ? r.receiver_id : r.sender_id));
  return exclude;
}

export async function generateMatch(
  userId: string,
  userProfile: Profile,
): Promise<{ profile: Profile; score: number; reason: string } | null> {
  // Return today's cached match if one exists AND is still eligible
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('match_suggestions')
    .select('suggested_user_id, score, reason')
    .eq('user_id', userId)
    .gte('shown_at', todayStart.toISOString())
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (existing?.suggested_user_id) {
    const [cachedRes, excludeSet] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', existing.suggested_user_id).single(),
      buildExcludeSet(userId),
    ]);

    if (cachedRes.data && !excludeSet.has(existing.suggested_user_id)) {
      console.log('[matching] returning cached match:', cachedRes.data.full_name, 'score:', existing.score);
      return { profile: cachedRes.data, score: existing.score ?? 0, reason: existing.reason ?? '' };
    }
    console.log('[matching] cached match is no longer eligible — generating fresh');
  }

  // Fetch candidate pool
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_complete', true)
    .neq('id', userId)
    .limit(100);

  if (error) {
    console.error('[matching] candidates fetch error:', error);
    return null;
  }

  console.log('[matching] candidate pool size:', candidates?.length ?? 0);

  if (!candidates || candidates.length === 0) return null;

  // Exclude connected + pending (re-use fresh set for correctness)
  const exclude = await buildExcludeSet(userId);
  const eligible = candidates.filter((c) => !exclude.has(c.id));

  console.log('[matching] eligible after exclusions:', eligible.length, '| excluded:', exclude.size);

  if (eligible.length === 0) return null;

  // Score and pick the best
  const scored = eligible
    .map((c) => ({ ...scoreCandidate(userProfile, c), profile: c }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  console.log('[matching] best match:', best.profile.full_name, 'score:', best.score, 'reason:', best.reason);

  // Persist suggestion (non-blocking)
  supabase
    .from('match_suggestions')
    .insert({
      user_id: userId,
      suggested_user_id: best.profile.id,
      score: best.score,
      reason: best.reason,
      shown_at: new Date().toISOString(),
      was_acted_on: false,
    })
    .then(
      () => {},
      (err: unknown) => console.error('[matching] could not store suggestion (check RLS):', err),
    );

  return best;
}
