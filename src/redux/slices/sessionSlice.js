import { createSlice } from "@reduxjs/toolkit";
import { sessions as dummySessions } from "../../data/dummyData.js";

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

const getSessionsForUser = (userId) => {
  if (!userId || userId === "1") {
    const existing = loadStorage("skillbridge_sessions_1", null) || loadStorage("skillbridge_sessions", null);
    if (existing && Array.isArray(existing)) return existing;
    saveStorage("skillbridge_sessions_1", dummySessions);
    saveStorage("skillbridge_sessions", dummySessions);
    return dummySessions;
  }
  return loadStorage(`skillbridge_sessions_${userId}`, []);
};

const saveUserSessions = (sessions) => {
  const uid = getUserId();
  saveStorage(`skillbridge_sessions_${uid}`, sessions);
  if (uid === "1") {
    saveStorage("skillbridge_sessions", sessions);
  }
};

const initialSessions = (() => {
  const uid = getUserId();
  return getSessionsForUser(uid);
})();

const sessionSlice = createSlice({
  name: "sessions",
  initialState: { sessions: initialSessions },
  reducers: {
    addSession(state, action) {
      state.sessions.unshift({
        id: Date.now(),
        mode: "Video call",
        status: "upcoming",
        ...action.payload,
      });
      saveUserSessions(state.sessions);
    },
    completeSession(state, action) {
      const s = state.sessions.find((item) => item.id === action.payload);
      if (s) {
        s.status = "completed";
        saveUserSessions(state.sessions);
      }
    },
    cancelSession(state, action) {
      state.sessions = state.sessions.filter((item) => item.id !== action.payload);
      saveUserSessions(state.sessions);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload || { id: 1 };
        const uid = String(user.id);
        state.sessions = getSessionsForUser(uid);
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        const uid = user ? String(user.id) : Date.now().toString();
        state.sessions = [];
        saveStorage(`skillbridge_sessions_${uid}`, []);
      })
      .addCase("user/logoutUser", (state) => {
        state.sessions = dummySessions;
      });
  },
});

export const { addSession, completeSession, cancelSession } = sessionSlice.actions;
export default sessionSlice.reducer;
