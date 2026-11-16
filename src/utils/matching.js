/**
 * SKILLBRIDGE Smart Match Score Calculator
 * Simple, transparent, and easy to explain during a BCA viva:
 * Compares current user's skills (teaches/wants) against the partner's skills.
 * 
 * - Mutual cross-match (I teach what they want & they teach what I want): 95% (Excellent Match)
 * - One-way skill match (one complementary skill): 70% - 80% (Good Match)
 * - Category / interest similarity: 60% (Possible Match)
 * - Baseline: 50% (Possible Match)
 */
export function calculateMatchScore(currentUser, targetUser) {
  if (!targetUser) return { score: 70, label: "Good Match", tier: "good", icon: "🟡" };
  if (!currentUser) {
    const base = targetUser.match || 75;
    return {
      score: base,
      label: base >= 85 ? "Excellent Match" : base >= 65 ? "Good Match" : "Possible Match",
      tier: base >= 85 ? "excellent" : base >= 65 ? "good" : "possible",
      icon: base >= 85 ? "🟢" : base >= 65 ? "🟡" : "⚪",
    };
  }

  const myTeaches = (currentUser.teaches || []).map((s) => s.trim().toLowerCase());
  const myWants = (currentUser.wants || []).map((s) => s.trim().toLowerCase());
  const theirTeaches = (targetUser.teaches || []).map((s) => s.trim().toLowerCase());
  const theirWants = (targetUser.wants || []).map((s) => s.trim().toLowerCase());

  // 1. Check mutual cross-match
  const iTeachWhatTheyWant = myTeaches.some((t) =>
    theirWants.some((w) => w === t || w.includes(t) || t.includes(w))
  );
  const theyTeachWhatIWant = theirTeaches.some((t) =>
    myWants.some((w) => w === t || w.includes(t) || t.includes(w))
  );

  if (iTeachWhatTheyWant && theyTeachWhatIWant) {
    return { score: 95, label: "Excellent Match", tier: "excellent", icon: "🟢" };
  }

  // 2. One-way skill match
  if (theyTeachWhatIWant || iTeachWhatTheyWant) {
    const modeMatch =
      !currentUser.mode ||
      !targetUser.mode ||
      currentUser.mode === "Both" ||
      targetUser.mode === "Both" ||
      currentUser.mode === targetUser.mode;
    const score = modeMatch ? 80 : 70;
    return { score, label: "Good Match", tier: "good", icon: "🟡" };
  }

  // 3. Category / interest alignment
  if (currentUser.category && targetUser.category && currentUser.category === targetUser.category) {
    return { score: 60, label: "Possible Match", tier: "possible", icon: "🔵" };
  }

  // 4. Baseline
  const fallback = targetUser.match || 50;
  return {
    score: fallback,
    label: fallback >= 85 ? "Excellent Match" : fallback >= 65 ? "Good Match" : "Possible Match",
    tier: fallback >= 85 ? "excellent" : fallback >= 65 ? "good" : "possible",
    icon: fallback >= 85 ? "🟢" : fallback >= 65 ? "🟡" : "⚪",
  };
}

