import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import DoodleIllustration from "../components/DoodleIllustration";
import Reveal from "../components/Reveal";
import SkillTag from "../components/SkillTag";

const STATS = [
  { value: "1,200+", label: "Active learners" },
  { value: "350+", label: "Skills offered" },
  { value: "4,800+", label: "Exchanges completed" },
  { value: "4.9/5", label: "Community rating" },
];

const VALUES = [
  { title: "Learn from real people", text: "Every lesson comes from a real person who actually uses the skill every day.", doodle: "connecting", blob: "left" },
  { title: "Grow together", text: "Teaching is learning too. The community grows when everyone shares.", doodle: "community", blob: "top" },
  { title: "No fees, ever", text: "Skills are exchanged, not sold. Knowledge should be free to pass on.", doodle: "heart", blob: "right" },
];

export default function About() {
  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <Reveal className="section-head" style={{ marginBottom: 44 }}>
        <span className="eyebrow">About SkillBridge</span>
        <h2 className="section-title">We believe learning is better when we share it.</h2>
        <p className="section-sub">
          SkillBridge started with a simple idea: everyone knows something worth teaching,
          and everyone wants to learn something.
        </p>
      </Reveal>

      <Reveal>
        <div className="panel about-story" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 40, padding: 48, alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }} className="float-slow">
            <DoodleIllustration type="community" size={280} blob="right" />
          </div>
          <div>
            <h3 style={{ fontSize: 28, marginBottom: 14 }}>Our story</h3>
            <p style={{ color: "var(--gray)", marginBottom: 14, fontSize: 15.5 }}>
              We noticed that most learning today happens through expensive courses and recorded
              videos — but the best learning still happens between two people, one teaching and
              one listening. SkillBridge makes that easy to find.
            </p>
            <p style={{ color: "var(--gray)", fontSize: 15.5 }}>
              You list the skills you can teach and the ones you want to learn. Our matching helps
              you find a partner, you schedule sessions, chat, and grow together — no money involved.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              <SkillTag yellow>Photography</SkillTag>
              <SkillTag>React</SkillTag>
              <SkillTag>English</SkillTag>
              <SkillTag>Guitar</SkillTag>
              <SkillTag>Cooking</SkillTag>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="stat-grid" style={{ marginTop: 30 }}>
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 100}>
            <div className="stat-card" style={{ textAlign: "center" }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label" style={{ marginTop: 8 }}>{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <section className="section" style={{ paddingTop: 80 }}>
        <Reveal className="section-head">
          <span className="eyebrow">Our values</span>
          <h2 className="section-title">What we stand for.</h2>
        </Reveal>
        <div className="why-grid">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 140} className="why-item">
              <div style={{ display: "flex", justifyContent: "center" }}>
                <DoodleIllustration type={v.doodle} size={180} circle blob={v.blob} />
              </div>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <div className="cta-panel panel" style={{ marginBottom: 60 }}>
          <div className="cta-doodle left float-slow">
            <DoodleIllustration type="teaching" size={160} blob="left" />
          </div>
          <div className="cta-doodle right float-delay">
            <DoodleIllustration type="learning" size={160} blob="right" />
          </div>
          <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)" }}>Ready to share what you know?</h2>
          <p>Join SkillBridge today and find your first learning partner.</p>
          <Link to="/register" className="btn btn-dark">Create your profile <FiArrowRight /></Link>
        </div>
      </Reveal>
    </div>
  );
}
