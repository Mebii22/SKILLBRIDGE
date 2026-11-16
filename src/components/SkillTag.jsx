export default function SkillTag({ children, yellow = false }) {
  return <span className={`tag ${yellow ? "yellow" : ""}`}>{children}</span>;
}
