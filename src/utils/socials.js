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

  // If the user entered the platform name or generic URL, go to the main webpage
  const lower = clean.toLowerCase();
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
    return clean;
  }

  const handle = clean.replace(/^@/, "");
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${handle}`;
    case "twitter":
      return `https://x.com/${handle}`;
    case "linkedin":
      return handle.startsWith("in/")
        ? `https://www.linkedin.com/${handle}`
        : `https://www.linkedin.com/in/${handle}`;
    case "github":
      return `https://github.com/${handle}`;
    default:
      return clean;
  }
}
