import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiBookmark } from "react-icons/fi";
import ProfileCard from "../../components/ProfileCard";
import EmptyState from "../../components/EmptyState";
import { removeSaved, fetchSavedProfilesAsync, toggleSavedAsync } from "../../redux/slices/savedSlice";
import { fetchUsersAsync } from "../../redux/slices/userSlice";

export default function SavedProfiles() {
  const savedIds = useSelector((s) => s.saved.savedIds);
  const allUsers = useSelector((s) => s.user.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchSavedProfilesAsync());
    dispatch(fetchUsersAsync());
  }, [dispatch]);

  const savedUsers = (allUsers || []).filter((u) =>
    savedIds.some((sid) => String(sid) === String(u.id || u._id))
  );

  if (savedUsers.length === 0) {
    return (
      <>
        <div className="page-head">
          <h1>Saved Profiles</h1>
          <p>People you want to learn from later.</p>
        </div>
        <EmptyState
          doodle="search"
          title="No saved profiles"
          text="You haven’t found your next learning partner yet."
          actionLabel="Explore People"
          onAction={() => navigate("/discover")}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Saved Profiles</h1>
        <p>{savedUsers.length} people saved for later.</p>
      </div>
      <div className="card-grid">
        {savedUsers.map((u) => (
          <div key={u._id || u.id} style={{ position: "relative" }}>
            <ProfileCard user={u} />
            <button
              className="btn-xs danger"
              style={{ position: "absolute", top: 14, right: 14 }}
              onClick={() => {
                const uid = u.id || u._id;
                dispatch(removeSaved(uid));
                dispatch(toggleSavedAsync(u._id || u.id));
              }}
            >
              <FiBookmark /> Remove
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
