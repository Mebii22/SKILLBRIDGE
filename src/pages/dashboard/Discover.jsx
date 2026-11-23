import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiSearch, FiPlus } from "react-icons/fi";
import ProfileCard from "../../components/ProfileCard";
import Reveal from "../../components/Reveal";
import { CATEGORIES, LOCATIONS } from "../../data/dummyData";
import { calculateMatchScore } from "../../utils/matching";
import { fetchUsersAsync } from "../../redux/slices/userSlice";

const MODES = [
  { key: "All", label: "All Modes" },
  { key: "Online", label: "🌐 Online" },
  { key: "Offline", label: "📍 Offline" },
  { key: "Both", label: "🔄 Both" },
];

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [recommendationFilter, setRecommendationFilter] = useState("all");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All Locations");
  const [modeFilter, setModeFilter] = useState("All");
  const [sort, setSort] = useState("match");

  const allUsers = useSelector((s) => s.user.users);
  const currentUser = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchUsersAsync());
  }, [dispatch]);

  // Keep query in sync if searchParams change (e.g., browser back/forward or navigation)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  const filtered = (allUsers || [])
    .filter((u) => {
      // Don't show current logged-in user or disabled accounts in discover
      if (currentUser && String(u.id || u._id) === String(currentUser.id || currentUser._id)) return false;
      if (u.status === "Disabled") return false;

      const q = query.trim().toLowerCase();
      const teaches = u.teaches || [];
      const wants = u.wants || [];

      const matchesQuery =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.location && u.location.toLowerCase().includes(q)) ||
        teaches.some((t) => t.toLowerCase().includes(q)) ||
        wants.some((t) => t.toLowerCase().includes(q));

      const matchesCat = category === "All" || u.category === category;
      const matchesLoc = location === "All Locations" || u.location === location || (u.city && location.includes(u.city));
      const matchesMode =
        modeFilter === "All" ||
        u.mode === modeFilter ||
        u.mode === "Both" ||
        (modeFilter === "Both" && (u.mode === "Online" || u.mode === "Offline" || u.mode === "Both"));

      // Match recommendation category filter
      let matchesRec = true;
      if (recommendationFilter !== "all" && currentUser) {
        const matchData = calculateMatchScore(currentUser, u);
        if (recommendationFilter === "mutual") {
          matchesRec = matchData.recommendationType === "mutual";
        } else if (recommendationFilter === "can_teach_you") {
          matchesRec = (matchData.theyTeachYouWant || []).length > 0;
        } else if (recommendationFilter === "you_can_teach") {
          matchesRec = (matchData.youTeachTheyWant || []).length > 0;
        }
      }

      return matchesQuery && matchesCat && matchesLoc && matchesMode && matchesRec;
    })
    .sort((a, b) => {
      if (sort === "match") {
        const scoreA = calculateMatchScore(currentUser, a).score;
        const scoreB = calculateMatchScore(currentUser, b).score;
        return scoreB - scoreA;
      }
      return (a.name || "").localeCompare(b.name || "");
    });

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1>Find someone who can teach you something new.</h1>
          <p>Search by skill, filter by category or location, and connect with your next learning partner.</p>
        </div>
        <Link to="/share-skill" className="btn btn-dark btn-sm" style={{ whiteSpace: "nowrap" }}>
          <FiPlus /> Share a Skill
        </Link>
      </div>

      <div className="controls">
        <div className="search-bar" style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <FiSearch style={{ flexShrink: 0 }} />
          <input
            placeholder="Search skills, people or city… (e.g. photography, react, kochi)"
            value={query}
            onChange={handleQueryChange}
            style={{ flex: 1, paddingRight: query ? 28 : undefined }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSearchParams({});
              }}
              style={{
                position: "absolute",
                right: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--gray)",
                fontSize: 14,
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <select className="select" value={location} onChange={(e) => setLocation(e.target.value)}>
          {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select className="select" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          {MODES.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="match">Sort: Best Smart Match</option>
          <option value="name">Sort: Name A–Z</option>
        </select>
      </div>

      <div className="controls" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className={`chip ${recommendationFilter === "all" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("all")}
        >
          ✨ All Matches
        </button>
        <button
          className={`chip ${recommendationFilter === "mutual" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("mutual")}
          title="Users where both of you can teach what the other wants"
        >
          ⚡ Mutual Matches
        </button>
        <button
          className={`chip ${recommendationFilter === "can_teach_you" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("can_teach_you")}
          title="Users who can teach skills you want to learn"
        >
          🎓 Can Teach You
        </button>
        <button
          className={`chip ${recommendationFilter === "you_can_teach" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("you_can_teach")}
          title="Users who want to learn skills you can teach"
        >
          🤝 You Can Teach
        </button>
      </div>

      <div className="controls" style={{ marginTop: 8 }}>
        <button className={`chip ${category === "All" ? "active" : ""}`} onClick={() => setCategory("All")}>All</button>
        {CATEGORIES.filter((c) => c !== "All Skills").map((c) => (
          <button key={c} className={`chip ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <p className="result-count">{filtered.length} people found</p>

      {filtered.length === 0 ? (
        <div className="dash-panel">
          <div className="empty">
            <p style={{ marginBottom: 0 }}>No one matches that search yet — try another skill or city.</p>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((u, i) => (
            <Reveal key={u.id || u._id || i} delay={(i % 3) * 110}>
              <ProfileCard user={u} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
