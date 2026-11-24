/**
 * SKILLBRIDGE Smart Match Score Calculator (Frontend)
 *
 * Intelligent deterministic scoring model:
 * - Mutual match (You teach what partner wants AND partner teaches what you want): ~95%
 * - One-way skill match (Partner teaches what you want OR you teach what partner wants): ~70–80%
 * - Category alignment (No direct skill match, but in the same domain/category): ~60%
 * - Baseline / Community match (No direct match): ~25–35%
 *
 * Scoring constraints:
 * - Deterministic, case-insensitive, whitespace-trimmed
 * - Prevents false positive matching between different skills (e.g. Java vs JavaScript)
 * - Safe handling of empty skill arrays
 * - Score strictly clamped between 20 and 100 (never exceeds 100)
 */

function normalizeSkill(str) {
  if (!str || typeof str !== "string") return "";
  return str.trim().toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

/**
 * Checks whether two skill strings match, handling case, whitespace,
 * and minor platform variations (e.g. 'react' and 'reactjs'), while
 * strictly preventing false positives (e.g. 'java' vs 'javascript').
 */
export function skillMatches(skillA, skillB) {
  const a = normalizeSkill(skillA);
  const b = normalizeSkill(skillB);
  if (!a || !b) return false;
  if (a === b) return true;

  // Suffix normalization: node vs nodejs, react vs reactjs, vue vs vuejs
  const stripJS = (s) => s.replace(/js$/, "");
  if (stripJS(a) === stripJS(b) && stripJS(a).length >= 3) {
    return true;
  }

  // Version number variations (e.g., python vs python3)
  const stripDigits = (s) => s.replace(/\d+$/, "");
  if (stripDigits(a) === stripDigits(b) && stripDigits(a).length >= 3) {
    return true;
  }

  return false;
}

export function findMatchingSkills(sourceList, targetList) {
  const matches = [];
  const seenNormalized = new Set();

  (sourceList || []).forEach((src) => {
    if (!src || typeof src !== "string" || !src.trim()) return;
    const cleanSrc = src.trim();
    const found = (targetList || []).find((tgt) => tgt && skillMatches(cleanSrc, tgt));
    const norm = normalizeSkill(cleanSrc);

    if (found && !seenNormalized.has(norm)) {
      seenNormalized.add(norm);
      matches.push(cleanSrc);
    }
  });

  return matches;
}

export function calculateMatchScore(currentUser, targetUser) {
  const targetName = targetUser?.name || targetUser?.fullName || "This partner";

  if (!targetUser) {
    return {
      score: 70,
      label: "Good Match",
      tier: "good",
      icon: "🟡",
      recommendationType: "general",
      explanation: "Default community compatibility",
      theyTeachYouWant: [],
      youTeachTheyWant: [],
    };
  }

  if (!currentUser) {
    const base = Number(targetUser.match) || 75;
    return {
      score: Math.min(100, Math.max(20, base)),
      label: base >= 85 ? "Excellent Match" : base >= 65 ? "Good Match" : "Potential Match",
      tier: base >= 85 ? "excellent" : base >= 65 ? "good" : "potential",
      icon: base >= 85 ? "🟢" : base >= 65 ? "🟡" : "🔵",
      recommendationType: "general",
      explanation: "Based on overall community interest and rating",
      theyTeachYouWant: [],
      youTeachTheyWant: [],
    };
  }

  // Self comparison returns 100%
  const currentUserId = currentUser._id || currentUser.id;
  const targetUserId = targetUser._id || targetUser.id;
  if (currentUserId && targetUserId && String(currentUserId) === String(targetUserId)) {
    return {
      score: 100,
      label: "Your Profile",
      tier: "self",
      icon: "👤",
      recommendationType: "self",
      explanation: "This is your own profile",
      theyTeachYouWant: [],
      youTeachTheyWant: [],
    };
  }

  const myTeaches = Array.isArray(currentUser.teaches) ? currentUser.teaches : [];
  const myWants = Array.isArray(currentUser.wants) ? currentUser.wants : [];
  const theirTeaches = Array.isArray(targetUser.teaches) ? targetUser.teaches : [];
  const theirWants = Array.isArray(targetUser.wants) ? targetUser.wants : [];

  // Find overlapping skills in both directions
  // theyTeachYouWant: skills partner teaches that you want to learn
  const theyTeachYouWant = findMatchingSkills(theirTeaches, myWants);
  // youTeachTheyWant: skills you teach that partner wants to learn
  const youTeachTheyWant = findMatchingSkills(myTeaches, theirWants);

  const isMutual = theyTeachYouWant.length > 0 && youTeachTheyWant.length > 0;
  const isTheyTeach = theyTeachYouWant.length > 0;
  const isYouTeach = youTeachTheyWant.length > 0;

  // Category Alignment
  const catA = (currentUser.category || "").trim().toLowerCase();
  const catB = (targetUser.category || "").trim().toLowerCase();
  const isCategoryMatch = Boolean(
    catA && catB && (catA === catB || catA === "all skills" || catB === "all skills")
  );

  // Mode Compatibility
  const modeA = (currentUser.mode || "Both").toLowerCase();
  const modeB = (targetUser.mode || "Both").toLowerCase();
  const isModeMatch = modeA === "both" || modeB === "both" || modeA === modeB;

  // Location Proximity
  const locA = (currentUser.city || currentUser.location || "").trim().toLowerCase();
  const locB = (targetUser.city || targetUser.location || "").trim().toLowerCase();
  const isLocMatch = Boolean(locA && locB && (locA.includes(locB) || locB.includes(locA)));

  // Rating & Activity bonus
  const hasHighRating = (Number(targetUser.rating) || 0) >= 4.5;

  let score = 0;
  let recommendationType = "general";

  if (isMutual) {
    // 1. MUTUAL MATCH (~95%)
    score = 90;
    // Skill depth bonus: +2 pts per additional mutual skill beyond the first, max 5 pts
    const extraDepth = theyTeachYouWant.length + youTeachTheyWant.length - 2;
    if (extraDepth > 0) {
      score += Math.min(5, extraDepth * 2);
    }
    if (isCategoryMatch) score += 2;
    if (isModeMatch) score += 1;
    if (isLocMatch) score += 1;
    if (hasHighRating) score += 1;
    recommendationType = "mutual";
  } else if (isTheyTeach || isYouTeach) {
    // 2. ONE-WAY SKILL MATCH (~70–80%)
    score = 70;
    const matchCount = isTheyTeach ? theyTeachYouWant.length : youTeachTheyWant.length;
    if (matchCount > 1) {
      score += Math.min(5, (matchCount - 1) * 3);
    }
    if (isCategoryMatch) score += 3;
    if (isModeMatch) score += 1;
    if (isLocMatch) score += 1;
    recommendationType = isTheyTeach ? "can_teach_you" : "you_can_teach";
  } else if (isCategoryMatch) {
    // 3. CATEGORY ALIGNMENT (~60%)
    score = 56;
    if (isModeMatch) score += 2;
    if (isLocMatch) score += 2;
    recommendationType = "category";
  } else {
    // 4. LOW / NO MATCH SCENARIO (~25–35%)
    score = 25;
    if (isModeMatch) score += 3;
    if (isLocMatch) score += 2;
    recommendationType = "general";
  }

  // Strictly clamp between 20 and 100
  score = Math.min(100, Math.max(20, Math.round(score)));

  // Human-readable match labels
  let tier = "potential";
  let icon = "🔵";
  let label = "Potential Match";

  if (score >= 85) {
    tier = "excellent";
    icon = "🟢";
    label = "Excellent Match";
  } else if (score >= 65) {
    tier = "good";
    icon = "🟡";
    label = "Good Match";
  }

  // Clear, understandable explanation
  let explanation = "";
  if (isMutual) {
    const teachStr = theyTeachYouWant.join(", ");
    const learnStr = youTeachTheyWant.join(", ");
    explanation = `Mutual Match: ${targetName} can teach you ${teachStr}, and wants to learn ${learnStr} from you!`;
  } else if (isTheyTeach) {
    const teachStr = theyTeachYouWant.join(", ");
    explanation = `${targetName} can teach ${teachStr}, which is on your learning wishlist.`;
  } else if (isYouTeach) {
    const learnStr = youTeachTheyWant.join(", ");
    explanation = `You can teach ${learnStr}, which ${targetName} is looking to learn.`;
  } else if (isCategoryMatch) {
    explanation = `Both passionate about ${targetUser.category || currentUser.category || "creative skills"}.`;
  } else if (isLocMatch) {
    explanation = `Nearby peer learner in ${targetUser.city || targetUser.location || "your region"}.`;
  } else {
    explanation = `Community member on SkillBridge exploring peer exchanges.`;
  }

  return {
    score,
    label,
    tier,
    icon,
    recommendationType,
    theyTeachYouWant,
    youTeachTheyWant,
    explanation,
  };
}
