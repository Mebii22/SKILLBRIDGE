import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiArrowRight, FiStar } from "react-icons/fi";
import DoodleIllustration from "../components/DoodleIllustration";
import Reveal from "../components/Reveal";
import ProfileCard from "../components/ProfileCard";
import SkillTag from "../components/SkillTag";
import { users, CATEGORIES, CATEGORY_ICONS, testimonials } from "../data/dummyData";

const STEPS = [
  {
    num: "STEP 01",
    title: "Share Your Skills",
    text: "Tell the community what you can teach — from React to photography to cooking.",
    doodle: "teaching",
    tags: ["React", "Photography", "English"],
  },
  {
    num: "STEP 02",
    title: "Find Your Learning Partner",
    text: "Discover real people who have the skills you want to learn, near you or online.",
    doodle: "search",
    tags: ["92% match", "Verified people", "Nearby"],
  },
  {
    num: "STEP 03",
    title: "Exchange & Grow",
    text: "Connect, schedule sessions, and learn together — one skill at a time.",
    doodle: "skill-exchange",
    tags: ["Live sessions", "Messages", "Progress"],
  },
];

const WHY = [
  {
    title: "Real People",
    text: "Learn directly from people with real skills — not pre-recorded videos.",
    doodle: "connecting",
    blob: "left",
  },
  {
    title: "Meaningful Connections",
    text: "Build genuine connections while you learn something new.",
    doodle: "chat",
    blob: "right",
  },
  {
    title: "Learn Without Limits",
    text: "Exchange knowledge instead of paying for every lesson.",
    doodle: "learning",
    blob: "top",
  },
];

const SKILL_NODES = [
  { label: "Photography", x: 450, y: 48 },
  { label: "English", x: 648, y: 104 },
  { label: "Guitar", x: 648, y: 216 },
  { label: "React", x: 450, y: 272 },
  { label: "Video Editing", x: 252, y: 216 },
  { label: "UI Design", x: 252, y: 104 },
];

const PAIRS = ["Photography → Video Editing", "English → Web Development", "Guitar → Graphic Design", "React → UI Design"];

export default function Home() {
  const allUsers = useSelector((s) => s.user.users);
  const featuredUsers = (allUsers && allUsers.length > 0 ? allUsers : users)
    .filter((u) => u.status !== "Disabled")
    .slice(0, 3);
  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero container">
        <div className="hero-panel panel">
          {/* thin hand-drawn background curves */}
          <svg className="bg-line drift" style={{ top: 30, left: -20 }} width="230" height="170" viewBox="0 0 230 170">
            <path d="M10 160 Q70 20 220 46" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" className="draw" />
          </svg>
          <svg className="bg-line drift" style={{ bottom: 120, right: -30 }} width="240" height="180" viewBox="0 0 240 180">
            <path d="M230 20 Q150 160 20 130" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" className="draw" />
            <circle cx="200" cy="40" r="6" stroke="#111" strokeWidth="2" fill="none" />
          </svg>

          <div className="hero-content">
            <span className="hero-pill fade-up"><i /> Peer-to-peer skill exchange</span>
            <h1 className="fade-up d1">
              Learn What You Want.<br />Teach What You <span className="highlight">Know.</span>
            </h1>
            <p className="hero-sub fade-up d2">
              Connect with people who have the skills you want to learn — and share the skills you
              already know. Learn together. Teach each other. Grow together.
            </p>
            <div className="hero-cta fade-up d3">
              <Link to="/register" className="btn btn-dark">Join SkillBridge</Link>
              <Link to="/discover" className="btn btn-outline">Explore Skills</Link>
            </div>
          </div>

          <div className="hero-doodles fade-in d4">
            <div className="hero-doodle left float-slow">
              <DoodleIllustration type="hero-left" size={300} blob="left" />
            </div>
            <div className="hero-doodle right float-delay">
              <DoodleIllustration type="hero-right" size={300} blob="right" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="section" id="how-it-works">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">How it works</span>
            <h2 className="section-title">Learning is better when we share it.</h2>
            <p className="section-sub">Three simple steps between you and your next skill.</p>
          </Reveal>

          <div className="steps">
            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 140}>
                <div className="step">
                  <div className="step-num">{step.num}</div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
                    <DoodleIllustration type={step.doodle} size={185} circle />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <div className="skill-line">
                    {step.tags.map((t) => <SkillTag key={t} yellow={i === 0}>{t}</SkillTag>)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED EXCHANGES ============ */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Featured exchanges</span>
            <h2 className="section-title">People are already learning from each other.</h2>
            <p className="section-sub">Real members, real skills, real progress — meet a few of them.</p>
          </Reveal>

          <div className="card-grid">
            {featuredUsers.map((u, i) => (
              <Reveal key={u.id} delay={i * 130}>
                <ProfileCard user={u} />
              </Reveal>
            ))}
          </div>

          <Reveal style={{ textAlign: "center", marginTop: 36 }}>
            <Link to="/discover" className="btn btn-outline">
              Browse all people <FiArrowRight />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Categories</span>
            <h2 className="section-title">Find a skill that excites you.</h2>
          </Reveal>
          <div className="cat-grid">
            {CATEGORIES.map((cat, i) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <Reveal key={cat} delay={(i % 4) * 90}>
                  <Link to="/discover" className="cat-card">
                    <div className="cat-icon"><Icon /></div>
                    {cat}
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ WHY SKILLBRIDGE ============ */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Why SkillBridge</span>
            <h2 className="section-title">Why we think learning together works.</h2>
          </Reveal>
          <div className="why-grid">
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={i * 140} className="why-item">
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <DoodleIllustration type={w.doodle} size={180} circle blob={w.blob} />
                </div>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMMUNITY MAP ============ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="community-panel panel">
              <span className="eyebrow">Community</span>
              <h2 className="section-title">Every skill has something to offer.</h2>
              <p className="section-sub" style={{ maxWidth: 520, margin: "16px auto 0" }}>
                Skills connect in surprising ways. Here is how yours might link up.
              </p>

              <svg className="community-svg" viewBox="0 0 900 320">
                {SKILL_NODES.map((n) => (
                  <g key={n.label}>
                    <line
                      x1="450" y1="160" x2={n.x} y2={n.y}
                      stroke="#111" strokeWidth="2" className="dash-anim"
                    />
                    <circle
                      cx={(450 + n.x) / 2} cy={(160 + n.y) / 2} r="5"
                      fill="#F7C843" stroke="#111" strokeWidth="2"
                    />
                    <circle cx={n.x} cy={n.y} r="40" fill="#FFFDF9" stroke="#111" strokeWidth="2.5" />
                    <text
                      x={n.x} y={n.y} dy="0.35em" textAnchor="middle"
                      fontSize="13" fontWeight="700" fill="#111" fontFamily="Manrope, sans-serif"
                    >
                      {n.label}
                    </text>
                  </g>
                ))}
                <circle cx="450" cy="160" r="48" fill="#F7C843" stroke="#111" strokeWidth="2.5" />
                <text
                  x="450" y="160" dy="0.35em" textAnchor="middle"
                  fontSize="17" fontWeight="800" fill="#111" fontFamily="'Playfair Display', serif"
                >
                  You
                </text>
              </svg>

              <div className="pair-chips">
                {PAIRS.map((p) => <SkillTag key={p} yellow>{p}</SkillTag>)}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Testimonials</span>
            <h2 className="section-title">Stories from our community.</h2>
          </Reveal>
          <div className="testi-grid">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 130}>
                <div className="testi-card">
                  <div className="stars">
                    {[...Array(5)].map((_, s) => <FiStar key={s} fill="#F7C843" stroke="#111" strokeWidth={1} />)}
                  </div>
                  <p className="testi-quote">“{t.quote}”</p>
                  <div className="testi-author">
                    <img src={t.photo} alt={t.name} />
                    <div>
                      <div className="t-name">{t.name}</div>
                      <div className="t-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <Reveal>
            <div className="cta-panel panel">
              <div className="cta-doodle left float-slow">
                <DoodleIllustration type="skill-exchange" size={170} blob="left" />
              </div>
              <div className="cta-doodle right float-delay">
                <DoodleIllustration type="community" size={180} blob="right" />
              </div>
              <span className="eyebrow">Join the community</span>
              <h2>Your next skill might be one conversation away.</h2>
              <p>Create a free profile, share what you know, and find someone to learn from today.</p>
              <Link to="/register" className="btn btn-dark">Join SkillBridge <FiArrowRight /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
