/**
 * Single source of truth for classifying SKILLBRIDGE admin activity records.
 *
 * Categories:
 * - "users": Genuine user account management activities:
 *   - USER_DISABLED, USER_ACTIVATED, USER_DELETED
 *   - Verified legacy user account status records (disabled, activated, permanently removed)
 *   - Records whose targetType is "User" (and not a skill action)
 *
 * - "skills": Genuine skill moderation activities:
 *   - SKILL_REMOVED, SKILL_RESTORED, SKILL_APPROVED
 *   - Records whose targetType is "Skill", "UserSkill", or "SkillListing"
 *   - Verified legacy skill moderation records (skill removed, skill listing restored)
 *
 * - "other": Unclassified or general platform activities:
 *   - SYSTEM_NOTICE, REPORT_RESOLVED, or unclassified logs (visible in "All Actions" only)
 *
 * Crucial rules:
 * - Skill activities (e.g. removing a skill from a user profile) must NEVER leak into User Actions.
 * - User activities (e.g. disabling a user who has skills) must NEVER leak into Skills Actions.
 * - Categories are strictly disjoint (mutually exclusive).
 */

export function getActivityCategory(activity) {
  if (!activity) return "other";

  const action = (activity.action || "").toUpperCase().trim();
  const targetType = (activity.targetType || "").trim();
  const text = (activity.text || "").trim();

  // 1. Explicit Standardized Skill Action Codes
  const skillActionCodes = ["SKILL_REMOVED", "SKILL_RESTORED", "SKILL_APPROVED"];
  if (skillActionCodes.includes(action)) {
    return "skills";
  }

  // 2. Explicit Standardized User Action Codes
  const userActionCodes = ["USER_DISABLED", "USER_ACTIVATED", "USER_DELETED"];
  if (userActionCodes.includes(action)) {
    return "users";
  }

  // 3. Explicit Target Types (when action code is missing or non-standard)
  if (targetType === "Skill" || targetType === "UserSkill" || targetType === "SkillListing") {
    return "skills";
  }
  if (targetType === "User") {
    return "users";
  }

  // 4. Legacy records inspection (where action and targetType were undefined in early versions)
  // Check verified legacy skill patterns:
  if (
    /^Skill\s+['"].*['"]\s+/i.test(text) ||
    /^Skill listing\s+['"].*['"]\s+/i.test(text)
  ) {
    return "skills";
  }

  // Check verified legacy user patterns:
  if (
    /^User\s+['"].*['"].*was\s+(disabled|activated|reactivated|deleted|banned)\s+by/i.test(text) ||
    /^User account\s+['"].*['"].*was\s+(disabled|activated|reactivated|deleted|permanently removed)\s+by/i.test(text)
  ) {
    return "users";
  }

  // 5. Unclassified or system activities
  return "other";
}

export function isUserActivity(activity) {
  return getActivityCategory(activity) === "users";
}

export function isSkillActivity(activity) {
  return getActivityCategory(activity) === "skills";
}
