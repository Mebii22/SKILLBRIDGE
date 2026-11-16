import { createSlice } from "@reduxjs/toolkit";
import { notifications as dummyNotifications } from "../../data/dummyData.js";

const loadStorage = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const saveStorage = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
};

const getUserId = () => {
  const u = loadStorage("currentUser", null);
  return u ? String(u.id) : "1";
};

const getNotificationsForUser = (userId, userName = "Learner") => {
  if (!userId || userId === "1") {
    const existing = loadStorage("skillbridge_notifications_1", null) || loadStorage("skillbridge_notifications", null);
    if (existing && Array.isArray(existing)) return existing;
    saveStorage("skillbridge_notifications_1", dummyNotifications);
    saveStorage("skillbridge_notifications", dummyNotifications);
    return dummyNotifications;
  }
  const existing = loadStorage(`skillbridge_notifications_${userId}`, null);
  if (existing && Array.isArray(existing)) return existing;
  const initial = [
    {
      id: Date.now(),
      type: "session",
      title: "Welcome to SkillBridge!",
      text: `Welcome ${userName}! Your account is active. Explore matches and start your skill exchange!`,
      time: "Just now",
      read: false,
    },
  ];
  saveStorage(`skillbridge_notifications_${userId}`, initial);
  return initial;
};

const saveUserNotifications = (items) => {
  const uid = getUserId();
  saveStorage(`skillbridge_notifications_${uid}`, items);
  if (uid === "1") {
    saveStorage("skillbridge_notifications", items);
  }
};

const initialNotifications = (() => {
  const u = loadStorage("currentUser", null);
  const uid = u ? String(u.id) : "1";
  return getNotificationsForUser(uid, u?.name);
})();

const notificationSlice = createSlice({
  name: "notifications",
  initialState: { items: initialNotifications },
  reducers: {
    addNotification(state, action) {
      state.items.unshift({
        id: Date.now(),
        read: false,
        time: "Just now",
        ...action.payload,
      });
      saveUserNotifications(state.items);
    },
    markRead(state, action) {
      const n = state.items.find((i) => i.id === action.payload);
      if (n) {
        n.read = true;
        saveUserNotifications(state.items);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => {
        n.read = true;
      });
      saveUserNotifications(state.items);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload || { id: 1 };
        const uid = String(user.id);
        state.items = getNotificationsForUser(uid, user.name || "Learner");
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        const uid = user ? String(user.id) : Date.now().toString();
        const welcome = [
          {
            id: Date.now(),
            type: "session",
            title: "Welcome to SkillBridge!",
            text: `Welcome ${user?.name || "Learner"}! Your account is active. Explore matches and start your skill exchange!`,
            time: "Just now",
            read: false,
          },
        ];
        state.items = welcome;
        saveStorage(`skillbridge_notifications_${uid}`, welcome);
      })
      .addCase("user/logoutUser", (state) => {
        state.items = dummyNotifications;
      });
  },
});

export const { addNotification, markRead, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
