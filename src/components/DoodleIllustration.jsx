/* Reusable original hand-drawn style SVG doodles for SKILLBRIDGE.
   All illustrations are drawn by hand in code — simple black line art. */

const P = {
  fill: "none",
  stroke: "#111",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/* A simple standing person. Origin = feet. */
function Person({ x = 0, y = 0, s = 1, flip = false, shirt = false, hair = "short", armL, armR }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-7 -30 L-9 0 M7 -30 L9 0 M-9 0 h-8 M9 0 h8" {...P} />
      <path d="M-16 -30 L-13 -58 Q0 -68 13 -58 L16 -30 Q0 -23 -16 -30 Z" fill={shirt ? "#111" : "none"} {...P} />
      <path d={armL || "M-13 -52 Q-24 -40 -20 -27"} {...P} />
      <path d={armR || "M13 -52 Q24 -40 20 -27"} {...P} />
      <circle cx="0" cy="-79" r="14" fill="#FFFDF9" {...P} />
      {hair === "bun" && <circle cx="0" cy="-96" r="5.5" fill="#111" />}
      <path
        d={hair === "curly" ? "M-14 -84 Q-10 -98 0 -96 Q10 -98 14 -84 Q7 -91 0 -90 Q-7 -91 -14 -84" : "M-14 -83 Q0 -100 14 -83"}
        {...P}
      />
      <circle cx="-5" cy="-81" r="1.7" fill="#111" stroke="none" />
      <circle cx="5" cy="-81" r="1.7" fill="#111" stroke="none" />
      <path d="M-5 -73 Q0 -69 5 -73" {...P} />
    </g>
  );
}

/* A simple sitting person with a laptop. */
function SeatedPerson({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-2 -32 L30 -32 L34 -2 M34 -2 h9" {...P} />
      <path d="M-15 -32 L-13 -62 Q0 -71 13 -62 L15 -32 Q0 -26 -15 -32 Z" {...P} />
      <path d="M10 -56 Q26 -48 38 -54" {...P} />
      <circle cx="0" cy="-80" r="13" fill="#FFFDF9" {...P} />
      <path d="M-13 -84 Q0 -99 13 -84" {...P} />
      <circle cx="-4.5" cy="-82" r="1.6" fill="#111" stroke="none" />
      <circle cx="4.5" cy="-82" r="1.6" fill="#111" stroke="none" />
      <path d="M-4 -75 Q0 -72 4 -75" {...P} />
      <rect x="26" y="-80" width="36" height="26" rx="4" fill="#FFFDF9" {...P} />
      <path d="M22 -54 L68 -54 L72 -46 L18 -46 Z" fill="#FFFDF9" {...P} />
      <path d="M37 -72 l-5 6 5 6 M53 -72 l5 6 -5 6" {...P} strokeWidth="2.5" />
    </g>
  );
}

const DOODLES = {
  /* two people exchanging knowledge with arrows */
  "skill-exchange": (
    <svg viewBox="0 0 240 200">
      <Person x={64} y={182} s={1.02} armR="M13 -52 Q34 -46 42 -58" />
      <Person x={176} y={182} s={1.02} flip shirt armR="M13 -52 Q34 -46 42 -58" />
      <path d="M96 86 Q120 70 144 86" {...P} />
      <path d="M137 80 L146 87 L136 91" {...P} />
      <path d="M144 118 Q120 134 96 118" {...P} />
      <path d="M103 112 L94 119 L104 123" {...P} />
      <path d="M120 30 v14 M113 37 h14" {...P} />
    </svg>
  ),

  /* a person teaching at a board */
  teaching: (
    <svg viewBox="0 0 240 200">
      <rect x="126" y="34" width="96" height="66" rx="9" {...P} />
      <path d="M142 100 L134 152 M206 100 L214 152" {...P} />
      <path d="M138 52 h48 M138 67 h64 M138 82 h36" {...P} strokeWidth="2.5" />
      <circle cx="203" cy="85" r="7" {...P} strokeWidth="2.5" />
      <Person x={68} y={180} s={1.08} armR="M13 -52 Q38 -58 60 -72" />
      <path d="M228 22 v10 M223 27 h10" {...P} strokeWidth="2.5" />
    </svg>
  ),

  /* two people connecting, holding hands */
  connecting: (
    <svg viewBox="0 0 240 200">
      <path d="M62 74 Q120 30 178 74" className="draw" {...P} />
      <circle cx="62" cy="74" r="4" fill="#111" />
      <circle cx="178" cy="74" r="4" fill="#111" />
      <circle cx="120" cy="50" r="5.5" fill="#F7C843" stroke="#111" strokeWidth="2.5" />
      <Person x={62} y={184} armR="M13 -52 Q30 -42 46 -40" />
      <Person x={178} y={184} flip shirt armR="M13 -52 Q30 -42 46 -40" />
      <circle cx="120" cy="144" r="7" fill="#F7C843" {...P} />
    </svg>
  ),

  /* someone learning to code on a laptop */
  coding: (
    <svg viewBox="0 0 240 200">
      <Person x={92} y={182} s={1.08} armL="M-13 -52 Q-26 -46 -38 -54" armR="M13 -52 Q32 -46 46 -54" />
      <rect x="118" y="88" width="68" height="48" rx="7" fill="#FFFDF9" {...P} />
      <path d="M136 104 l-8 8 8 8 M162 104 l8 8 -8 8 M152 124 L144 104" {...P} strokeWidth="2.5" />
      <path d="M110 136 L194 136 L202 150 L102 150 Z" fill="#FFFDF9" {...P} />
      <path d="M64 56 v12 M58 62 h12" {...P} strokeWidth="2.5" />
      <path d="M214 66 v10 M209 71 h10" {...P} strokeWidth="2.5" />
    </svg>
  ),

  /* someone teaching photography with a camera */
  photography: (
    <svg viewBox="0 0 240 200">
      <Person x={120} y={184} s={1.12} armL="M-13 -52 Q-26 -66 -21 -86" armR="M13 -52 Q26 -66 21 -86" />
      <rect x="95" y="84" width="50" height="34" rx="8" fill="#FFFDF9" {...P} />
      <rect x="104" y="77" width="12" height="7" rx="2" {...P} strokeWidth="2.5" />
      <circle cx="120" cy="101" r="10" {...P} />
      <circle cx="120" cy="101" r="4" fill="#111" stroke="none" />
      <path d="M156 74 v10 M151 79 h10" {...P} strokeWidth="2.5" />
    </svg>
  ),

  /* someone playing / teaching guitar */
  guitar: (
    <svg viewBox="0 0 240 200">
      <Person x={82} y={184} s={1.08} armR="M13 -52 Q30 -48 44 -58" />
      <circle cx="134" cy="120" r="17" fill="#FFFDF9" {...P} />
      <circle cx="156" cy="106" r="13" fill="#FFFDF9" {...P} />
      <circle cx="138" cy="114" r="4" fill="#111" stroke="none" />
      <path d="M168 96 L208 70 M208 70 l9 -5 M148 104 L206 78" {...P} strokeWidth="2.5" />
      <path d="M210 40 v12 M204 46 h12" {...P} strokeWidth="2.5" />
    </svg>
  ),

  /* someone reading / learning from a book */
  reading: (
    <svg viewBox="0 0 240 200">
      <Person x={120} y={188} s={1.02} armL="M-13 -52 Q-34 -44 -50 -68" armR="M13 -52 Q34 -44 50 -68" />
      <path d="M68 98 L120 112 L172 98 L172 140 L120 154 L68 140 Z" fill="#FFFDF9" {...P} />
      <path d="M120 112 L120 154" {...P} strokeWidth="2.5" />
      <path d="M78 106 L110 116 M78 116 L110 126 M130 116 L162 106 M130 126 L162 116" {...P} strokeWidth="2.2" />
    </svg>
  ),

  /* a group of people collaborating together */
  community: (
    <svg viewBox="0 0 260 200">
      <path d="M52 86 Q130 34 208 86" className="draw" {...P} />
      <circle cx="52" cy="86" r="4" fill="#111" />
      <circle cx="208" cy="86" r="4" fill="#111" />
      <circle cx="130" cy="58" r="5.5" fill="#F7C843" stroke="#111" strokeWidth="2.5" />
      <Person x={52} y={180} s={0.88} hair="bun" />
      <Person x={130} y={188} s={1} shirt hair="curly" />
      <Person x={208} y={180} s={0.88} flip />
    </svg>
  ),

  /* someone learning with a raised hand */
  learning: (
    <svg viewBox="0 0 240 200">
      <Person x={108} y={184} s={1.06} armR="M13 -52 Q28 -78 24 -102" />
      <path d="M24 -102 L38 -120 M38 -120 L44 -126" {...P} strokeWidth="2.5" />
      <path d="M52 178 Q76 168 100 178 L100 192 Q76 184 52 192 Z M100 178 Q124 168 148 178 L148 192 Q124 184 100 192 Z" fill="#FFFDF9" {...P} strokeWidth="2.5" />
      <path d="M166 48 v14 M159 55 h14" {...P} strokeWidth="2.5" />
      <path d="M186 92 v10 M181 97 h10" {...P} strokeWidth="2.5" />
    </svg>
  ),

  /* two people chatting */
  chat: (
    <svg viewBox="0 0 240 200">
      <rect x="26" y="30" width="66" height="42" rx="13" fill="#FFFDF9" {...P} />
      <path d="M46 72 L42 88 L62 72" fill="#FFFDF9" {...P} />
      <circle cx="47" cy="51" r="2.6" fill="#111" stroke="none" />
      <circle cx="59" cy="51" r="2.6" fill="#111" stroke="none" />
      <circle cx="71" cy="51" r="2.6" fill="#111" stroke="none" />
      <rect x="148" y="22" width="66" height="42" rx="13" fill="#F7C843" {...P} />
      <path d="M194 64 L198 80 L178 64" fill="#F7C843" {...P} />
      <path d="M158 36 h46 M158 47 h30" {...P} strokeWidth="2.5" />
      <Person x={62} y={186} s={0.95} armR="M13 -52 Q26 -46 38 -56" />
      <Person x={178} y={186} s={0.95} flip shirt armR="M13 -52 Q26 -46 38 -56" />
    </svg>
  ),

  /* magnifier — used for empty "nothing found" states */
  search: (
    <svg viewBox="0 0 240 200">
      <Person x={64} y={184} s={0.98} />
      <circle cx="152" cy="108" r="30" fill="#FFFDF9" {...P} />
      <path d="M174 130 L202 158" {...P} />
      <path d="M142 108 l7 7 l14 -14" {...P} strokeWidth="2.5" />
      <path d="M204 60 v10 M199 65 h10" {...P} strokeWidth="2.5" />
    </svg>
  ),

  /* heart — used for saved / empty states */
  heart: (
    <svg viewBox="0 0 240 200">
      <circle cx="120" cy="100" r="72" {...P} strokeDasharray="3 9" strokeWidth="2.5" />
      <path d="M120 152 C68 118 74 76 104 74 C114 73 120 84 120 91 C120 84 126 73 136 74 C166 76 172 118 120 152 Z" fill="#F7C843" {...P} />
      <path d="M44 40 v10 M39 45 h10" {...P} strokeWidth="2.5" />
      <path d="M198 52 v10 M193 57 h10" {...P} strokeWidth="2.5" />
    </svg>
  ),

  /* hero left group — teacher at board + learner with laptop */
  "hero-left": (
    <svg viewBox="0 0 340 260">
      <rect x="196" y="36" width="118" height="78" rx="10" fill="#FFFDF9" {...P} />
      <path d="M216 114 L206 168 M296 114 L306 168" {...P} />
      <path d="M210 56 h58 M210 74 h84 M210 92 h46" {...P} strokeWidth="2.5" />
      <circle cx="296" cy="98" r="8" {...P} strokeWidth="2.5" />
      <path d="M322 24 v10 M317 29 h10" {...P} strokeWidth="2.5" />
      <Person x={152} y={236} s={1.12} armR="M13 -52 Q36 -60 54 -70" />
      <SeatedPerson x={64} y={246} s={1} />
    </svg>
  ),

  /* hero right group — people connecting */
  "hero-right": (
    <svg viewBox="0 0 340 260">
      <path d="M84 122 Q170 58 256 122" className="draw" {...P} />
      <circle cx="84" cy="122" r="4.5" fill="#111" />
      <circle cx="256" cy="122" r="4.5" fill="#111" />
      <circle cx="170" cy="88" r="6" fill="#F7C843" stroke="#111" strokeWidth="2.5" />
      <circle cx="40" cy="60" r="5" {...P} strokeWidth="2.5" />
      <circle cx="304" cy="70" r="6" {...P} strokeWidth="2.5" />
      <Person x={84} y={240} s={1.12} armR="M13 -52 Q30 -44 44 -42" />
      <Person x={256} y={240} s={1.12} flip shirt armR="M13 -52 Q30 -44 44 -42" />
      <SeatedPerson x={170} y={252} s={0.95} />
    </svg>
  ),
};

export default function DoodleIllustration({ type = "skill-exchange", size = 180, circle = false, blob = null, className = "" }) {
  const sizeValue = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={`doodle-wrap ${circle ? "doodle-circle" : ""} ${className}`}
      style={{
        "--doodle-size": sizeValue,
        width: sizeValue,
      }}
    >
      {blob && <span className={`yellow-blob blob-${blob} drift`} />}
      <div className="doodle">{DOODLES[type] || DOODLES["skill-exchange"]}</div>
    </div>
  );
}
