import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FiSearch,
  FiPlus,
  FiX,
  FiMapPin,
  FiClock,
  FiGlobe,
  FiBookOpen,
  FiSend,
  FiUser,
  FiStar,
  FiAward,
  FiArrowRight,
  FiRefreshCw,
  FiCalendar,
} from "react-icons/fi";
import ProfileCard from "../../components/ProfileCard";
import Reveal from "../../components/Reveal";
import SkillTag from "../../components/SkillTag";
import EmptyState from "../../components/EmptyState";
import ExchangeRequestModal from "../../components/ExchangeRequestModal";
import { CATEGORIES, LOCATIONS } from "../../data/dummyData";
import { calculateMatchScore } from "../../utils/matching";
import { fetchUsersAsync } from "../../redux/slices/userSlice";
import { fetchPublicSkillsAsync } from "../../redux/slices/skillSlice";

const MODES = [
  { key: "All", label: "All Modes" },
  { key: "Online", label: "🌐 Online" },
  { key: "Offline", label: "📍 Offline" },
  { key: "Both", label: "🔄 Both (Online & Offline)" },
];

const SKILL_LEVELS = ["All Levels", "Beginner", "Intermediate", "Advanced"];

const SORT_OPTIONS = [
  { key: "match", label: "Sort: Best Smart Match" },
  { key: "rating", label: "Sort: Highest Rated" },
  { key: "recent", label: "Sort: Recently Joined" },
  { key: "completed", label: "Sort: Most Exchanges" },
  { key: "name", label: "Sort: Name A–Z" },
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [location, setLocation] = useState("All Locations");
  const [modeFilter, setModeFilter] = useState("All");
  const [recommendationFilter, setRecommendationFilter] = useState("all");
  const [sort, setSort] = useState("match");
  const [viewMode, setViewMode] = useState("profiles"); // "profiles" | "listings"

  // Swap modal state for listing cards
  const [swapTarget, setSwapTarget] = useState(null);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapToast, setSwapToast] = useState("");

  const allUsers = useSelector((s) => s.user.users || []);
  const publicListings = useSelector((s) => s.skills?.publicListings || []);
  const currentUser = useSelector((s) => s.user.currentUser);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchUsersAsync());
    dispatch(fetchPublicSkillsAsync());
  }, [dispatch]);

  // Keep query in sync with URL searchParams
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val.trim() });
    } else {
      setSearchParams({});
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSearchParams({});
  };

  // Check if any non-default filter is currently active
  const isAnyFilterActive = useMemo(() => {
    return (
      query.trim() !== "" ||
      category !== "All" ||
      levelFilter !== "All Levels" ||
      location !== "All Locations" ||
      modeFilter !== "All" ||
      recommendationFilter !== "all" ||
      sort !== "match"
    );
  }, [query, category, levelFilter, location, modeFilter, recommendationFilter, sort]);

  const clearAllFilters = () => {
    setQuery("");
    setCategory("All");
    setLevelFilter("All Levels");
    setLocation("All Locations");
    setModeFilter("All");
    setRecommendationFilter("all");
    setSort("match");
    setSearchParams({});
  };

  // Safe normalized helper
  const cleanQ = query.trim().toLowerCase();

  // 1. FILTERED USERS / PROFILES
  const filteredUsers = useMemo(() => {
    return (allUsers || [])
      .filter((u) => {
        // Exclude current logged-in user, disabled users, and admin accounts
        const currentUserId = currentUser?._id || currentUser?.id;
        const targetUserId = u._id || u.id;
        if (currentUserId && targetUserId && String(currentUserId) === String(targetUserId)) {
          return false;
        }
        if (u.status === "Disabled" || u.role === "admin") return false;

        const teaches = Array.isArray(u.teaches) ? u.teaches : [];
        const wants = Array.isArray(u.wants) ? u.wants : [];

        // Check if user posted any listings matching the query description
        const userListingDescriptions = (publicListings || [])
          .filter((l) => String(l.user?._id || l.user) === String(targetUserId))
          .map((l) => (l.description || "").toLowerCase());

        // Text search (name, city, location, bio, category, teaches, wants, skill descriptions)
        const matchesQuery =
          !cleanQ ||
          (u.name && u.name.toLowerCase().includes(cleanQ)) ||
          (u.fullName && u.fullName.toLowerCase().includes(cleanQ)) ||
          (u.city && u.city.toLowerCase().includes(cleanQ)) ||
          (u.location && u.location.toLowerCase().includes(cleanQ)) ||
          (u.bio && u.bio.toLowerCase().includes(cleanQ)) ||
          (u.category && u.category.toLowerCase().includes(cleanQ)) ||
          teaches.some((t) => t.toLowerCase().includes(cleanQ)) ||
          wants.some((w) => w.toLowerCase().includes(cleanQ)) ||
          userListingDescriptions.some((d) => d.includes(cleanQ));

        // Category filter
        const matchesCat =
          category === "All" ||
          category === "All Skills" ||
          (u.category && u.category.toLowerCase() === category.toLowerCase()) ||
          teaches.some((t) => t.toLowerCase().includes(category.toLowerCase()));

        // Location filter
        const locClean = location.split(",")[0].trim().toLowerCase();
        const matchesLoc =
          location === "All Locations" ||
          (u.city && u.city.toLowerCase().includes(locClean)) ||
          (u.location && u.location.toLowerCase().includes(locClean));

        // Mode filter
        const matchesMode =
          modeFilter === "All" ||
          u.mode === modeFilter ||
          u.mode === "Both" ||
          (modeFilter === "Both" && (u.mode === "Online" || u.mode === "Offline" || u.mode === "Both"));

        // Recommendation filter
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
        if (sort === "rating") {
          return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        }
        if (sort === "completed") {
          return (Number(b.completed) || 0) - (Number(a.completed) || 0);
        }
        if (sort === "recent") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sort === "name") {
          return (a.name || "").localeCompare(b.name || "");
        }
        // Default sort: Smart Match Score
        const scoreA = calculateMatchScore(currentUser, a).score;
        const scoreB = calculateMatchScore(currentUser, b).score;
        return scoreB - scoreA;
      });
  }, [allUsers, publicListings, currentUser, cleanQ, category, location, modeFilter, recommendationFilter, sort]);

  // 2. FILTERED PUBLISHED SKILL LISTINGS
  const filteredListings = useMemo(() => {
    return (publicListings || [])
      .filter((listing) => {
        // Exclude logged in user's own listings
        const currentUserId = currentUser?._id || currentUser?.id;
        const publisherId = listing.user?._id || listing.user;
        if (currentUserId && publisherId && String(currentUserId) === String(publisherId)) {
          return false;
        }

        // Only approved listings
        if (listing.status && listing.status !== "approved") return false;

        // Exclude disabled or admin publisher
        if (listing.publisher) {
          if (listing.publisher.status === "Disabled" || listing.publisher.role === "admin") {
            return false;
          }
        }

        const title = (listing.title || listing.skill || "").toLowerCase();
        const desc = (listing.description || "").toLowerCase();
        const cat = (listing.category || "").toLowerCase();
        const publisherName = (listing.userName || listing.publisher?.name || "").toLowerCase();
        const loc = (listing.location || "").toLowerCase();

        // Search text
        const matchesQuery =
          !cleanQ ||
          title.includes(cleanQ) ||
          desc.includes(cleanQ) ||
          cat.includes(cleanQ) ||
          publisherName.includes(cleanQ) ||
          loc.includes(cleanQ);

        // Category filter
        const matchesCat =
          category === "All" ||
          category === "All Skills" ||
          cat === category.toLowerCase() ||
          title.includes(category.toLowerCase());

        // Level filter
        const matchesLevel =
          levelFilter === "All Levels" ||
          (listing.level && listing.level.toLowerCase().startsWith(levelFilter.toLowerCase()));

        // Mode filter
        const matchesMode =
          modeFilter === "All" ||
          listing.mode === modeFilter ||
          listing.mode === "Both" ||
          (modeFilter === "Both" && (listing.mode === "Online" || listing.mode === "Offline" || listing.mode === "Both"));

        // Location filter
        const locClean = location.split(",")[0].trim().toLowerCase();
        const matchesLoc =
          location === "All Locations" ||
          loc.includes(locClean) ||
          (listing.publisher?.city && listing.publisher.city.toLowerCase().includes(locClean));

        return matchesQuery && matchesCat && matchesLevel && matchesMode && matchesLoc;
      })
      .sort((a, b) => {
        if (sort === "recent") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sort === "rating") {
          return (Number(b.publisher?.rating) || 0) - (Number(a.publisher?.rating) || 0);
        }
        if (sort === "completed") {
          return (Number(b.publisher?.completed) || 0) - (Number(a.publisher?.completed) || 0);
        }
        if (sort === "name") {
          return (a.title || a.skill || "").localeCompare(b.title || b.skill || "");
        }
        // Match sorting for listings: compute score with publisher
        if (currentUser) {
          const scoreA = calculateMatchScore(currentUser, a.publisher || a).score;
          const scoreB = calculateMatchScore(currentUser, b.publisher || b).score;
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [publicListings, currentUser, cleanQ, category, levelFilter, modeFilter, location, sort]);

  // Handle Start Swap from a listing card
  const handleStartSwapFromListing = (listing) => {
    // Find the full publisher user object from allUsers or listing.publisher
    const publisherId = String(listing.user?._id || listing.user);
    const publisher =
      allUsers.find((u) => String(u._id || u.id) === publisherId) ||
      listing.publisher ||
      {
        _id: publisherId,
        id: publisherId,
        name: listing.userName || "Publisher",
        fullName: listing.userName || "Publisher",
        photo: listing.userPhoto || DEFAULT_AVATAR,
        teaches: [listing.title || listing.skill],
        mode: listing.mode,
        city: listing.location,
        location: listing.location,
      };

    setSwapTarget(publisher);
    setIsSwapOpen(true);
  };

  const handleSwapSuccess = () => {
    setSwapToast(`Exchange request sent to ${swapTarget?.name || "partner"}!`);
    setTimeout(() => setSwapToast(""), 3500);
  };

  return (
    <>
      <div
        className="page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1>Find someone who can teach you something new.</h1>
          <p>Search by skill, explore detailed published offerings, filter by level or mode, and discover smart mutual learning matches.</p>
        </div>
        <Link to="/share-skill" className="btn btn-dark btn-sm" style={{ whiteSpace: "nowrap" }}>
          <FiPlus /> Share a Skill
        </Link>
      </div>

      {/* TOAST MESSAGE */}
      {swapToast && (
        <div className="toast">
          <i /> {swapToast}
        </div>
      )}

      {/* SEARCH AND FILTERS CONTROLS BAR */}
      <div className="controls">
        <div className="search-bar" style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <FiSearch style={{ flexShrink: 0 }} />
          <input
            placeholder="Search by skill, name, category, or description… (e.g. React, Photography, Spanish, Kochi)"
            value={query}
            onChange={handleQueryChange}
            style={{ flex: 1, paddingRight: query ? 28 : undefined }}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
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

        {/* Location Filter */}
        <select className="select" value={location} onChange={(e) => setLocation(e.target.value)}>
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        {/* Level Filter */}
        <select className="select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          {SKILL_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>

        {/* Mode Filter */}
        <select className="select" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          {MODES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Sort Filter */}
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* SMART RECOMMENDATION CHIPS ROW */}
      <div className="controls" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className={`chip ${recommendationFilter === "all" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("all")}
        >
          ✨ All Matches
        </button>
        <button
          className={`chip ${recommendationFilter === "mutual" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("mutual")}
          title="Users where both of you can teach what the other wants to learn"
        >
          ⚡ Mutual Matches
        </button>
        <button
          className={`chip ${recommendationFilter === "can_teach_you" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("can_teach_you")}
          title="Peers who can teach skills you want to learn"
        >
          🎓 Can Teach You
        </button>
        <button
          className={`chip ${recommendationFilter === "you_can_teach" ? "active" : ""}`}
          onClick={() => setRecommendationFilter("you_can_teach")}
          title="Peers who want to learn skills you can teach"
        >
          🤝 You Can Teach
        </button>

        {/* Clear All Filters Button */}
        {isAnyFilterActive && (
          <button type="button" className="clear-filters-btn" onClick={clearAllFilters} title="Reset all search filters">
            <FiRefreshCw size={12} /> Clear All Filters
          </button>
        )}
      </div>

      {/* CATEGORY CHIPS ROW */}
      <div className="controls" style={{ marginTop: 8 }}>
        <button className={`chip ${category === "All" ? "active" : ""}`} onClick={() => setCategory("All")}>
          All Categories
        </button>
        {CATEGORIES.filter((c) => c !== "All Skills").map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* DISCOVER VIEW TABS: PROFILES vs PUBLISHED LISTINGS */}
      <div className="discover-view-tabs">
        <button
          type="button"
          className={`discover-view-tab ${viewMode === "profiles" ? "active" : ""}`}
          onClick={() => setViewMode("profiles")}
        >
          👥 Peer Profiles ({filteredUsers.length})
        </button>
        <button
          type="button"
          className={`discover-view-tab ${viewMode === "listings" ? "active" : ""}`}
          onClick={() => setViewMode("listings")}
        >
          📚 Published Skill Offerings ({filteredListings.length})
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: PEER PROFILES (ProfileCards with Smart Match) */}
      {/* ============================================================== */}
      {viewMode === "profiles" && (
        <>
          <p className="result-count">
            {filteredUsers.length} {filteredUsers.length === 1 ? "member found" : "members found"}
            {category !== "All" && ` in ${category}`}
            {location !== "All Locations" && ` near ${location}`}
          </p>

          {filteredUsers.length === 0 ? (
            <EmptyState
              doodle="search"
              title="No members match that search"
              text="Try adjusting your keywords, switching categories, or clearing active filters to discover more peer learners."
              actionLabel="Clear All Filters"
              onAction={clearAllFilters}
            />
          ) : (
            <div className="card-grid">
              {filteredUsers.map((u, i) => (
                <Reveal key={u.id || u._id || i} delay={(i % 3) * 110}>
                  <ProfileCard user={u} />
                </Reveal>
              ))}
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: PUBLISHED SKILL LISTINGS */}
      {/* ============================================================== */}
      {viewMode === "listings" && (
        <>
          <p className="result-count">
            {filteredListings.length} {filteredListings.length === 1 ? "skill listing found" : "skill listings found"}
            {category !== "All" && ` in ${category}`}
            {levelFilter !== "All Levels" && ` (${levelFilter})`}
          </p>

          {filteredListings.length === 0 ? (
            <EmptyState
              doodle="search"
              title="No published skill offerings match that criteria"
              text="Try expanding your search, changing proficiency level, or clear filters to see all community listings."
              actionLabel="Clear All Filters"
              onAction={clearAllFilters}
            />
          ) : (
            <div className="skill-listings-grid">
              {filteredListings.map((listing) => {
                const title = listing.title || listing.skill;
                const level = listing.level || "Intermediate";
                const mode = listing.mode || "Both";
                const publisherName = listing.userName || listing.publisher?.fullName || listing.publisher?.name || "Member";
                const publisherPhoto = listing.userPhoto || listing.publisher?.photo || DEFAULT_AVATAR;
                const publisherId = listing.publisher?._id || listing.publisher?.id || listing.user?._id || listing.user;

                // Match calculation with publisher
                const matchData = calculateMatchScore(currentUser, listing.publisher || listing);

                return (
                  <div key={listing.id || listing._id} className="skill-listing-card">
                    <div>
                      {/* Title and Category */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{title}</h3>
                          <SkillTag yellow>{listing.category || "Technology"}</SkillTag>
                        </div>
                        <span className="match-badge" title={matchData.label} style={{ fontSize: 12 }}>
                          {matchData.icon} {matchData.score}% Match
                        </span>
                      </div>

                      {/* Publisher Strip */}
                      <div className="listing-publisher-strip">
                        <div className="listing-publisher-avatar">
                          <img
                            src={publisherPhoto}
                            alt={publisherName}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(publisherName)}&background=F7C843&color=111111`;
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link
                            to={`/profile/${publisherId}`}
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: "var(--ink)",
                              textDecoration: "none",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {publisherName}
                          </Link>
                          <div style={{ fontSize: 12, color: "var(--gray)", display: "flex", gap: 8, alignItems: "center" }}>
                            {listing.publisher?.rating && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <FiStar fill="#F7C843" stroke="#111" size={11} /> {Number(listing.publisher.rating).toFixed(1)}
                              </span>
                            )}
                            {listing.publisher?.completed !== undefined && (
                              <span>{listing.publisher.completed} exchanges</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Meta chips */}
                      <div className="skill-meta-row">
                        <span className="skill-meta-chip">
                          <FiBookOpen size={12} /> {level}
                        </span>
                        <span className="skill-meta-chip">
                          <FiGlobe size={12} /> {mode}
                        </span>
                        {listing.location && (
                          <span className="skill-meta-chip">
                            <FiMapPin size={12} /> {listing.location}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: 13.5,
                          color: "var(--gray)",
                          lineHeight: 1.5,
                          margin: "10px 0 14px",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {listing.description || "No description provided."}
                      </p>

                      {listing.experience && (
                        <div style={{ fontSize: 12.5, color: "var(--ink)", marginBottom: 12, background: "var(--cream)", padding: "6px 10px", borderRadius: 8 }}>
                          <span style={{ fontWeight: 700 }}>Experience:</span> {listing.experience}
                        </div>
                      )}

                      {/* Availability & Date */}
                      <div style={{ fontSize: 12, color: "var(--gray)", display: "flex", flexDirection: "column", gap: 4, borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <FiClock /> {listing.availability || "Flexible"}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <FiCalendar /> Listed: {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                      <button
                        type="button"
                        className="btn btn-dark btn-sm"
                        style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6 }}
                        onClick={() => handleStartSwapFromListing(listing)}
                      >
                        <FiSend /> Start Swap
                      </button>
                      <Link
                        to={`/profile/${publisherId}`}
                        className="btn btn-outline btn-sm"
                        style={{ justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        Profile <FiArrowRight />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* EXCHANGE REQUEST MODAL FOR LISTINGS */}
      {swapTarget && (
        <ExchangeRequestModal
          targetUser={swapTarget}
          isOpen={isSwapOpen}
          onClose={() => {
            setIsSwapOpen(false);
            setSwapTarget(null);
          }}
          onSuccess={handleSwapSuccess}
        />
      )}
    </>
  );
}
