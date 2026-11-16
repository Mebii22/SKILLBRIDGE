/* SKILLBRIDGE loading screen: two hand-drawn people connecting with an animated line. */
export default function Loader() {
  return (
    <div className="loader-screen">
      <div className="loader-visual">
        <span className="loader-person" />
        <span className="loader-line">
          <i className="loader-dot" />
        </span>
        <span className="loader-person yellow" />
      </div>
      <div className="loader-logo">SKILLBRIDGE</div>
      <p>Connecting people through skills.</p>
    </div>
  );
}
