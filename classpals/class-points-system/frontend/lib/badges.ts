// Computed badge system — no DB required, derived from existing student data

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

const POINT_BADGES: { threshold: number; badge: Badge }[] = [
  {
    threshold: 50,
    badge: { id: 'star_50', name: '积分新星', emoji: '⭐', description: '累计积分达到50分', color: 'bg-yellow-100 text-yellow-700' },
  },
  {
    threshold: 200,
    badge: { id: 'star_200', name: '积分达人', emoji: '🌟', description: '累计积分达到200分', color: 'bg-orange-100 text-orange-700' },
  },
  {
    threshold: 500,
    badge: { id: 'star_500', name: '积分王者', emoji: '👑', description: '累计积分达到500分', color: 'bg-purple-100 text-purple-700' },
  },
  {
    threshold: 1000,
    badge: { id: 'star_1000', name: '积分传奇', emoji: '💎', description: '累计积分达到1000分', color: 'bg-blue-100 text-blue-700' },
  },
];

const RANK_BADGES: { rank: number; badge: Badge }[] = [
  {
    rank: 1,
    badge: { id: 'rank_1', name: '班级第一', emoji: '🥇', description: '班级积分排名第一', color: 'bg-yellow-100 text-yellow-700' },
  },
  {
    rank: 2,
    badge: { id: 'rank_2', name: '班级第二', emoji: '🥈', description: '班级积分排名第二', color: 'bg-gray-100 text-gray-700' },
  },
  {
    rank: 3,
    badge: { id: 'rank_3', name: '班级第三', emoji: '🥉', description: '班级积分排名第三', color: 'bg-amber-100 text-amber-700' },
  },
];

/**
 * Compute badges for a student based on their points and rank among all students.
 * @param totalPoints - student's total points
 * @param rank - 1-based rank among all students (optional)
 */
export function computeBadges(totalPoints: number, rank?: number): Badge[] {
  const badges: Badge[] = [];

  // Points-based badges (cumulative — earn all thresholds passed)
  for (const { threshold, badge } of POINT_BADGES) {
    if (totalPoints >= threshold) {
      badges.push(badge);
    }
  }

  // Rank-based badges
  if (rank !== undefined) {
    const rankBadge = RANK_BADGES.find((r) => r.rank === rank);
    if (rankBadge) badges.push(rankBadge.badge);
  }

  return badges;
}

/**
 * Compute badges for all students at once (efficient — rank computed once).
 */
export function computeAllBadges(
  students: { id: string; totalPoints: number }[]
): Map<string, Badge[]> {
  const sorted = [...students].sort((a, b) => b.totalPoints - a.totalPoints);
  const result = new Map<string, Badge[]>();

  students.forEach((student) => {
    const rank = sorted.findIndex((s) => s.id === student.id) + 1;
    result.set(student.id, computeBadges(student.totalPoints, rank));
  });

  return result;
}
