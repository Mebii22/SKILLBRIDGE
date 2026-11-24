import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import ProfileCard from "../../components/ProfileCard";
import EmptyState from "../../components/EmptyState";
import { removeSaved, fetchSavedProfilesAsync, toggleSavedAsync } from "../../redux/slices/savedSlice";
import { fetchUsersAsync } from "../../redux/slices/userSlice";

export default function SavedProfiles() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { savedIds, savedUsers, loading, error } = useSelector((s) => s.saved);
  const allUsers = useSelector((s) => s.user.users);

  useEffect(() => {
    dispatch(fetchSavedProfilesAsync());
    if (!allUsers || allUsers.length === 0) {
      dispatch(fetchUsersAsync());
    }
  }, [dispatch, allUsers]);

  // Merge full profile objects: prioritize backend enriched savedUsers, fallback to allUsers
  const activeSavedUsers = useMemo(() => {
    const userMap = new Map();

    // 1. Enriched profiles from backend getSavedProfiles
    (savedUsers || []).forEach((u) => {
      if (!u) return;
      const uid = String(u.id || u._id);
      if (savedIds.map(String).includes(uid)) {
        userMap.set(uid, u);
      }
    });

    // 2. Discover / community users matching savedIds
    (allUsers || []).forEach((u) => {
      if (!u) return;
      const uid = String(u.id || u._id);
      if (savedIds.map(String).includes(uid) && !userMap.has(uid)) {
        userMap.set(uid, u);
      }
    });

    return Array.from(userMap.values());
  }, [savedUsers, savedIds, allUsers]);

  const handleRetry = () => {
    dispatch(fetchSavedProfilesAsync());
  };

  const handleRemove = (targetId) => {
    const idStr = String(targetId);
    dispatch(removeSaved(idStr));
    dispatch(toggleSavedAsync(idStr));
  };

  return (
    <>
      <div
        className="page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Saved Profiles</h1>
          <p style={{ margin: 0, color: "var(--gray)", fontSize: "15px" }}>
            {activeSavedUsers.length === 1
              ? "1 peer bookmarked to connect and learn with."
              : `${activeSavedUsers.length} peers bookmarked to connect and learn with.`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={handleRetry}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 600,
          }}
          title="Refresh saved profiles"
        >
          <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div
          style={{
            background: "#fff0f0",
            border: "1px solid #ffcdd2",
            borderRadius: "14px",
            padding: "14px 18px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            color: "#b71c1c",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={handleRetry}
            style={{
              borderColor: "#b71c1c",
              color: "#b71c1c",
              padding: "4px 10px",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton / State */}
      {loading && activeSavedUsers.length === 0 ? (
        <div
          className="dash-panel"
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--surface)",
            borderRadius: "20px",
            border: "1px solid var(--border)",
          }}
        >
          <FiRefreshCw
            className="spin"
            size={28}
            style={{ color: "var(--ink)", marginBottom: "12px" }}
          />
          <p style={{ color: "var(--gray)", margin: 0, fontSize: "14px" }}>
            Loading your bookmarked members...
          </p>
        </div>
      ) : activeSavedUsers.length === 0 ? (
        /* Empty State */
        <EmptyState
          doodle="search"
          title="No saved profiles yet"
          text="When you find peers with skills you'd love to learn on Discover, bookmark their profile to easily reach out later."
          actionLabel="Explore People on Discover"
          onAction={() => navigate("/discover")}
        />
      ) : (
        /* Responsive Card Grid */
        <div className="card-grid">
          {activeSavedUsers.map((u) => {
            const uid = u.id || u._id;
            return (
              <ProfileCard
                key={uid}
                user={u}
                showRemoveBtn={true}
                onRemove={handleRemove}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
