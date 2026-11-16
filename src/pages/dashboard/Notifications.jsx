import { useDispatch, useSelector } from "react-redux";
import { FiRepeat, FiCheckCircle, FiMessageCircle, FiCalendar, FiAward } from "react-icons/fi";
import { markAllRead, markRead } from "../../redux/slices/notificationSlice";

const ICONS = {
  request: FiRepeat,
  accepted: FiCheckCircle,
  message: FiMessageCircle,
  session: FiCalendar,
  completed: FiAward,
};

export default function Notifications() {
  const items = useSelector((s) => s.notifications.items);
  const dispatch = useDispatch();
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}.` : "You're all caught up!"}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => dispatch(markAllRead())}>Mark all as read</button>
        )}
      </div>

      <div className="notif-list">
        {items.map((n) => {
          const Icon = ICONS[n.type] || FiCalendar;
          return (
            <div
              key={n.id}
              className={`notif ${n.read ? "" : "unread"}`}
              onClick={() => dispatch(markRead(n.id))}
              style={{ cursor: "pointer" }}
            >
              <span className="notif-icon"><Icon /></span>
              <div className="notif-body">
                <div className="notif-title">
                  {n.title}
                  {!n.read && <span className="unread-dot" />}
                </div>
                <div className="notif-text">{n.text}</div>
              </div>
              <span className="notif-time">{n.time}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
