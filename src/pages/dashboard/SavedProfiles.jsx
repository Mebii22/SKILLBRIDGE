import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiBookmark } from "react-icons/fi";
import ProfileCard from "../../components/ProfileCard";
import EmptyState from "../../components/EmptyState";
import { removeSaved } from "../../redux/slices/savedSlice";

export default function SavedProfiles() {
  const savedIds = useSelector((s) => s.saved.savedIds);
  const allUsers = useSelector((s) => s.user.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const savedUsers = (allUsers || []).filter((u) => savedIds.includes(u.id));

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
          <div key={u.id} style={{ position: "relative" }}>
            <ProfileCard user={u} />
            <button
              className="btn-xs danger"
              style={{ position: "absolute", top: 14, right: 14 }}
              onClick={() => dispatch(removeSaved(u.id))}
            >
              <FiBookmark /> Remove
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
