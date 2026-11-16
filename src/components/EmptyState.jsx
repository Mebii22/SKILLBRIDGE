import DoodleIllustration from "./DoodleIllustration";

export default function EmptyState({ doodle = "search", title, text, actionLabel, onAction }) {
  return (
    <div className="dash-panel">
      <div className="empty">
        <DoodleIllustration type={doodle} size={170} circle blob="bottom" />
        <h3>{title}</h3>
        <p>{text}</p>
        {actionLabel && (
          <button className="btn btn-dark" onClick={onAction}>{actionLabel}</button>
        )}
      </div>
    </div>
  );
}
