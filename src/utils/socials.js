/**
 * Format a social media handle or URL into a clickable link.
 * If the user hasn't provided a handle, returns the platform's main webpage.
 */
export function getSocialUrl(platform, value) {
  if (!value || typeof value !== "string" || !value.trim()) {
    switch (platform) {
      case "instagram":
        return "https://www.instagram.com";
      case "twitter":
        return "https://x.com";
      case "linkedin":
        return "https://www.linkedin.com";
      case "github":
        return "https://github.com";
      default:
        return "#";
    }
  }

  const clean = value.trim();
  const lower = clean.toLowerCase();

  // Security hardening: Reject javascript:, data:, vbscript:, and malicious script schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.includes("<script") ||
    lower.includes("<") ||
    lower.includes(">")
  ) {
    return "#";
  }

  // If the user entered the platform name or generic URL, go to the main webpage
  if (
    lower === "linkedin" ||
    lower === "linkedin.com" ||
    lower === "www.linkedin.com" ||
    lower === "https://linkedin.com" ||
    lower === "https://www.linkedin.com" ||
    lower === "https://linkedin.com/" ||
    lower === "https://www.linkedin.com/"
  ) {
    return "https://www.linkedin.com";
  }

  if (
    lower === "instagram" ||
    lower === "instagram.com" ||
    lower === "www.instagram.com" ||
    lower === "https://instagram.com" ||
    lower === "https://www.instagram.com" ||
    lower === "https://instagram.com/" ||
    lower === "https://www.instagram.com/"
  ) {
    return "https://www.instagram.com";
  }

  if (
    lower === "twitter" ||
    lower === "twitter.com" ||
    lower === "x.com" ||
    lower === "https://twitter.com" ||
    lower === "https://x.com" ||
    lower === "https://twitter.com/" ||
    lower === "https://x.com/"
  ) {
    return "https://x.com";
  }

  if (
    lower === "github" ||
    lower === "github.com" ||
    lower === "www.github.com" ||
    lower === "https://github.com" ||
    lower === "https://www.github.com" ||
    lower === "https://github.com/" ||
    lower === "https://www.github.com/"
  ) {
    return "https://github.com";
  }

  // If already an absolute URL
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsed = new URL(clean);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return clean;
      }
    } catch {
      return "#";
    }
    return "#";
  }

  const handle = clean.replace(/^@/, "");
  const safeHandle = encodeURIComponent(handle).replace(/%2F/g, "/");

  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${safeHandle}`;
    case "twitter":
      return `https://x.com/${safeHandle}`;
    case "linkedin":
      return safeHandle.startsWith("in/")
        ? `https://www.linkedin.com/${safeHandle}`
        : `https://www.linkedin.com/in/${safeHandle}`;
    case "github":
      return `https://github.com/${safeHandle}`;
    default:
      return clean.startsWith("http://") || clean.startsWith("https://") ? clean : "#";
  }
}

/**
 * Validate that a social media input doesn't contain malicious schemes
 */
export function isSafeSocialInput(value) {
  if (!value || typeof value !== "string") return true;
  const clean = value.trim().toLowerCase();
  if (
    clean.startsWith("javascript:") ||
    clean.startsWith("data:") ||
    clean.startsWith("vbscript:") ||
    clean.includes("<script") ||
    clean.includes("<") ||
    clean.includes(">")
  ) {
    return false;
  }
  return true;
}
