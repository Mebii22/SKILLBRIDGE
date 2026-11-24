import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/client.js";

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
  return u ? String(u.id || u._id) : null;
};

const getSessionsForUser = (userId) => {
  if (!userId) return [];
  const existing = loadStorage(`skillbridge_sessions_${userId}`, null);
  if (existing && Array.isArray(existing)) return existing;
  return [];
};

const saveUserSessions = (sessions) => {
  const uid = getUserId();
  if (uid) {
    saveStorage(`skillbridge_sessions_${uid}`, sessions);
  }
};

// ASYNC THUNKS
export const fetchSessionsAsync = createAsyncThunk(
  "sessions/fetchSessionsAsync",
  async (status, { rejectWithValue }) => {
    try {
      const res = await API.get("/sessions", { params: status ? { status } : {} });
      return res.data.sessions || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch sessions");
    }
  }
);

export const createSessionAsync = createAsyncThunk(
  "sessions/createSessionAsync",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await API.post("/sessions", payload);
      return res.data.session;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create session");
    }
  }
);

export const completeSessionAsync = createAsyncThunk(
  "sessions/completeSessionAsync",
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.put(`/sessions/${id}/complete`);
      return res.data.session;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to complete session");
    }
  }
);

export const cancelSessionAsync = createAsyncThunk(
  "sessions/cancelSessionAsync",
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.put(`/sessions/${id}/cancel`);
      return res.data.session || { id, _id: id, status: "cancelled" };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to cancel session");
    }
  }
);

export const updateSessionAsync = createAsyncThunk(
  "sessions/updateSessionAsync",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/sessions/${id}`, updates);
      return res.data.session;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update session");
    }
  }
);

const initialSessions = (() => {
  const uid = getUserId();
  return getSessionsForUser(uid);
})();

const sessionSlice = createSlice({
  name: "sessions",
  initialState: {
    sessions: initialSessions,
    loading: false,
    error: null,
  },
  reducers: {
    addSession(state, action) {
      const payload = action.payload || {};
      const sid = String(payload.id || payload._id || Date.now());
      const exists = state.sessions.some((s) => String(s.id || s._id) === sid);
      if (!exists) {
        state.sessions.unshift({
          id: sid,
          mode: "Online Video",
          status: "upcoming",
          ...payload,
        });
        saveUserSessions(state.sessions);
      }
    },
    completeSession(state, action) {
      const s = state.sessions.find(
        (item) => String(item.id || item._id) === String(action.payload)
      );
      if (s) {
        s.status = "completed";
        saveUserSessions(state.sessions);
      }
    },
    cancelSession(state, action) {
      const s = state.sessions.find(
        (item) => String(item.id || item._id) === String(action.payload)
      );
      if (s) {
        s.status = "cancelled";
        saveUserSessions(state.sessions);
      }
    },
    clearSessionState(state) {
      state.sessions = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Sessions Async
      .addCase(fetchSessionsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessionsAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.sessions = action.payload;
          saveUserSessions(action.payload);
        }
      })
      .addCase(fetchSessionsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Session Async
      .addCase(createSessionAsync.fulfilled, (state, action) => {
        const newSession = action.payload;
        if (newSession) {
          const sid = String(newSession.id || newSession._id);
          const exists = state.sessions.some((s) => String(s.id || s._id) === sid);
          if (!exists) {
            state.sessions.unshift(newSession);
          } else {
            state.sessions = state.sessions.map((s) =>
              String(s.id || s._id) === sid ? newSession : s
            );
          }
          saveUserSessions(state.sessions);
        }
      })
      // Complete Session Async
      .addCase(completeSessionAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          const uid = String(updated.id || updated._id);
          state.sessions = state.sessions.map((s) =>
            String(s.id || s._id) === uid ? { ...s, ...updated, status: "completed" } : s
          );
          saveUserSessions(state.sessions);
        }
      })
      // Cancel Session Async (Preserve in cancelled state)
      .addCase(cancelSessionAsync.fulfilled, (state, action) => {
        const cancelled = action.payload;
        const cid = typeof cancelled === "object" ? String(cancelled.id || cancelled._id) : String(cancelled);
        state.sessions = state.sessions.map((s) => {
          if (String(s.id || s._id) === cid) {
            return typeof cancelled === "object"
              ? { ...s, ...cancelled, status: "cancelled" }
              : { ...s, status: "cancelled" };
          }
          return s;
        });
        saveUserSessions(state.sessions);
      })
      // Update Session Async
      .addCase(updateSessionAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          const uid = String(updated.id || updated._id);
          state.sessions = state.sessions.map((s) =>
            String(s.id || s._id) === uid ? { ...s, ...updated } : s
          );
          saveUserSessions(state.sessions);
        }
      })
      // User auth actions
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.sessions = getSessionsForUser(uid);
        } else {
          state.sessions = [];
        }
      })
      .addCase("user/loginUserAsync/fulfilled", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.sessions = getSessionsForUser(uid);
        } else {
          state.sessions = [];
        }
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        if (user) {
          const uid = String(user.id || user._id);
          state.sessions = [];
          saveStorage(`skillbridge_sessions_${uid}`, []);
        }
      })
      .addCase("user/registerUserAsync/fulfilled", (state) => {
        state.sessions = [];
      })
      .addCase("user/logoutUser", (state) => {
        state.sessions = [];
      })
      .addCase("user/logoutUserAsync/fulfilled", (state) => {
        state.sessions = [];
      });
  },
});

export const { addSession, completeSession, cancelSession, clearSessionState } = sessionSlice.actions;
export default sessionSlice.reducer;
