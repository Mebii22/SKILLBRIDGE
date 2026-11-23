/**
 * SKILLBRIDGE Smart Match Score Calculator (Frontend)
 * 
 * Intelligent deterministic scoring model:
 * - Mutual skill exchange (I teach what you want AND you teach what I want): 60 pts
 * - Skill depth / complementary skills: up to 15 pts
 * - Category / Domain alignment: 10 pts
 * - Learning mode compatibility: 5 pts
 * - Location / City proximity: 5 pts
 * - Rating & active availability: 5 pts
 * 
 * Returns score (0-100), label, tier, icon, exact matching skills, and explanation.
 */

function normalizeSkill(str) {
  if (!str || typeof str !== "string") return "";
  return str.trim().toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

function skillMatches(skillA, skillB) {
  const a = normalizeSkill(skillA);
  const b = normalizeSkill(skillB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length > 2 && b.length > 2) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

function findMatchingSkills(sourceList, targetList) {
  const matches = [];
  (sourceList || []).forEach((src) => {
    const found = (targetList || []).find((tgt) => skillMatches(src, tgt));
    if (found && !matches.includes(src)) {
      matches.push(src);
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
    const base = targetUser.match || 75;
    return {
      score: base,
      label: base >= 85 ? "Excellent Match" : base >= 65 ? "Good Match" : "Possible Match",
      tier: base >= 85 ? "excellent" : base >= 65 ? "good" : "possible",
      icon: base >= 85 ? "🟢" : base >= 65 ? "🟡" : "⚪",
      recommendationType: "general",
      explanation: "Based on overall community interest and rating",
      theyTeachYouWant: [],
      youTeachTheyWant: [],
    };
  }

  const myTeaches = currentUser.teaches || [];
  const myWants = currentUser.wants || [];
  const theirTeaches = targetUser.teaches || [];
  const theirWants = targetUser.wants || [];

  // Find overlapping skills in both directions
  const theyTeachYouWant = findMatchingSkills(theirTeaches, myWants);
  const youTeachTheyWant = findMatchingSkills(myTeaches, theirWants);

  const isMutual = theyTeachYouWant.length > 0 && youTeachTheyWant.length > 0;
  const isTheyTeach = theyTeachYouWant.length > 0;
  const isYouTeach = youTeachTheyWant.length > 0;

  let score = 0;
  let recommendationType = "general";

  if (isMutual) {
    // Mutual cross-match: 60 pts base
    score += 60;
    // Skill depth: 15 pts (additional skills or depth)
    const totalMatchingSkills = theyTeachYouWant.length + youTeachTheyWant.length;
    score += Math.min(15, 10 + (totalMatchingSkills - 2) * 2.5);
    recommendationType = "mutual";
  } else if (isTheyTeach || isYouTeach) {
    // One-way skill match: 40 pts base + up to 15 pts skill match
    score += 40;
    const matchingCount = isTheyTeach ? theyTeachYouWant.length : youTeachTheyWant.length;
    score += Math.min(15, 10 + (matchingCount - 1) * 5);
    recommendationType = isTheyTeach ? "can_teach_you" : "you_can_teach";
  } else {
    // Baseline community score: 30 pts
    score += 30;
  }

  // Category Alignment (10 pts)
  const catA = (currentUser.category || "").trim().toLowerCase();
  const catB = (targetUser.category || "").trim().toLowerCase();
  const isCategoryMatch = Boolean(catA && catB && (catA === catB || catA === "all skills" || catB === "all skills"));
  if (isCategoryMatch) {
    score += 10;
    if (recommendationType === "general") {
      recommendationType = "category";
    }
  }

  // Mode Compatibility (5 pts)
  const modeA = currentUser.mode || "Both";
  const modeB = targetUser.mode || "Both";
  const isModeMatch =
    modeA === "Both" ||
    modeB === "Both" ||
    modeA.toLowerCase() === modeB.toLowerCase();
  if (isModeMatch) {
    score += 5;
  }

  // Location Proximity (5 pts)
  const locA = (currentUser.city || currentUser.location || "").trim().toLowerCase();
  const locB = (targetUser.city || targetUser.location || "").trim().toLowerCase();
  const isLocMatch = Boolean(locA && locB && (locA.includes(locB) || locB.includes(locA)));
  if (isLocMatch) {
    score += 5;
  }

  // Availability / Rating (5 pts)
  const hasHighRating = (targetUser.rating || 0) >= 4.5;
  const isActive = targetUser.status !== "Disabled";
  if (hasHighRating || isActive) {
    score += 5;
  }

  // Normalize final score to 0 - 100 range
  score = Math.min(100, Math.max(30, Math.round(score)));

  // Tier, icon, label
  let tier = "possible";
  let icon = "⚪";
  let label = "Community Match";

  if (score >= 85) {
    tier = "excellent";
    icon = "🟢";
    label = "Excellent Match";
  } else if (score >= 65) {
    tier = "good";
    icon = "🟡";
    label = "Good Match";
  } else if (score >= 50) {
    tier = "possible";
    icon = "🔵";
    label = "Possible Match";
  }

  // Deterministic explanation string
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
    explanation = `You can teach ${learnStr}, which ${targetName} is actively looking to learn.`;
  } else if (isCategoryMatch) {
    explanation = `Both passionate about ${targetUser.category || currentUser.category}.`;
  } else if (isLocMatch) {
    explanation = `Nearby peer in ${targetUser.city || targetUser.location || "your region"}.`;
  } else {
    explanation = `Peer learner with shared interests in creative and technical skills.`;
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
