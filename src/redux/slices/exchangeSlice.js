import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/client.js";
import { exchanges as dummyExchanges } from "../../data/dummyData.js";

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

const getExchangesForUser = (userId) => {
  if (!userId) return [];
  const existing = loadStorage(`skillbridge_exchanges_${userId}`, null);
  if (existing && Array.isArray(existing)) return existing;
  return [];
};

const saveUserExchanges = (exchanges) => {
  const uid = getUserId();
  if (uid) {
    saveStorage(`skillbridge_exchanges_${uid}`, exchanges);
  }
};

// ASYNC THUNKS
export const fetchExchangesAsync = createAsyncThunk("exchanges/fetchExchangesAsync", async (status, { rejectWithValue }) => {
  try {
    const res = await API.get("/exchanges/my", { params: { status } });
    return res.data.exchanges;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch exchanges");
  }
});

export const createExchangeAsync = createAsyncThunk("exchanges/createExchangeAsync", async (payload, { rejectWithValue }) => {
  try {
    const res = await API.post("/exchanges", payload);
    return res.data.exchange;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create exchange");
  }
});

export const acceptExchangeAsync = createAsyncThunk("exchanges/acceptExchangeAsync", async (id, { rejectWithValue }) => {
  try {
    const res = await API.put(`/exchanges/${id}/accept`);
    return res.data.exchange;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to accept exchange");
  }
});

export const rejectExchangeAsync = createAsyncThunk("exchanges/rejectExchangeAsync", async (id, { rejectWithValue }) => {
  try {
    await API.put(`/exchanges/${id}/reject`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to reject exchange");
  }
});

export const cancelExchangeAsync = createAsyncThunk("exchanges/cancelExchangeAsync", async (id, { rejectWithValue }) => {
  try {
    await API.put(`/exchanges/${id}/cancel`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to cancel exchange");
  }
});

export const completeExchangeSessionAsync = createAsyncThunk("exchanges/completeSessionAsync", async ({ exchangeId, sessionId }, { rejectWithValue }) => {
  try {
    const res = await API.put(`/exchanges/${exchangeId}/complete-session`, { sessionId });
    return res.data.exchange;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to complete session");
  }
});

export const submitExchangeReviewAsync = createAsyncThunk("exchanges/submitReviewAsync", async ({ exchangeId, rating, review }, { rejectWithValue }) => {
  try {
    const res = await API.post(`/exchanges/${exchangeId}/review`, { rating, review });
    return res.data.exchange;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to submit review");
  }
});

const initialExchanges = (() => {
  const uid = getUserId();
  return getExchangesForUser(uid);
})();

const exchangeSlice = createSlice({
  name: "exchanges",
  initialState: {
    exchanges: initialExchanges,
    loading: false,
    error: null,
  },
  reducers: {
    sendRequest(state, action) {
      const payload = action.payload || {};
      const totalSessions = Number(payload.totalSessions) || 4;
      const mode = payload.mode || "Online";
      const duration = payload.duration || "1 Hour";
      const schedule = payload.schedule || "Weekly on mutually agreed time";
      const location = payload.meetingLocation || (mode === "Offline" ? "Public Library / Cafe" : "");
      const meetingLink = payload.meetingLink || (mode === "Online" ? "https://meet.google.com/sb-learn-hub" : "");

      const generatedSessions = Array.from({ length: totalSessions }, (_, idx) => {
        const num = idx + 1;
        return {
          id: Date.now() + num,
          sessionNum: num,
          title: `Session ${num}: ${num % 2 === 1 ? payload.teach || "Skill Exchange" : payload.want || "Skill Exchange"}`,
          date: payload.preferredDate || new Date(Date.now() + num * 7 * 86400000).toISOString().split("T")[0],
          time: payload.preferredTime || "5:00 PM",
          duration,
          topic: num === 1 ? "Foundations & Goal Setting" : num === totalSessions ? "Advanced Project & Review" : "Hands-on Practice & Exercises",
          mode,
          meetingLink: mode === "Online" ? meetingLink : undefined,
          meetingLocation: mode === "Offline" ? location : undefined,
          status: "upcoming",
        };
      });

      const agreement = payload.agreement || {
        myCommitment: `I will teach ${payload.teach || "my skill"} (${totalSessions} sessions, ${duration} each)`,
        partnerCommitment: `${payload.partnerName || "Partner"} will teach ${payload.want || "their skill"} (${totalSessions} sessions, ${duration} each)`,
        mode,
        totalSessions,
        duration,
        schedule,
        meetingLink: mode === "Online" ? meetingLink : undefined,
        location: mode === "Offline" ? location : undefined,
        status: "pending",
        acceptedAt: null,
      };

      state.exchanges.unshift({
        id: Date.now(),
        status: "pending",
        progress: 0,
        totalSessions,
        completedSessions: 0,
        duration,
        mode,
        agreement,
        sessions: generatedSessions,
        nextSession: generatedSessions[0] ? {
          date: generatedSessions[0].date,
          time: generatedSessions[0].time,
          skill: generatedSessions[0].title,
          mode,
          meetingLink: generatedSessions[0].meetingLink,
          meetingLocation: generatedSessions[0].meetingLocation,
        } : null,
        createdAt: "Just now",
        ...payload,
      });
      saveUserExchanges(state.exchanges);
    },
    acceptRequest(state, action) {
      const ex = state.exchanges.find((e) => e.id === action.payload || e._id === action.payload);
      if (ex) {
        ex.status = "active";
        if (ex.agreement) {
          ex.agreement.status = "active";
          ex.agreement.acceptedAt = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        saveUserExchanges(state.exchanges);
      }
    },
    rejectRequest(state, action) {
      const ex = state.exchanges.find((e) => e.id === action.payload || e._id === action.payload);
      if (ex) {
        ex.status = "cancelled";
        if (ex.agreement) ex.agreement.status = "cancelled";
        saveUserExchanges(state.exchanges);
      }
    },
    cancelExchange(state, action) {
      const ex = state.exchanges.find((e) => e.id === action.payload || e._id === action.payload);
      if (ex) {
        ex.status = "cancelled";
        if (ex.agreement) ex.agreement.status = "cancelled";
        saveUserExchanges(state.exchanges);
      }
    },
    completeExchangeSession(state, action) {
      const { exchangeId, sessionId } = action.payload;
      const ex = state.exchanges.find((e) => e.id === exchangeId || e._id === exchangeId);
      if (ex && ex.sessions) {
        const session = ex.sessions.find((s) => s.id === sessionId || s._id === sessionId);
        if (session) {
          session.status = "completed";
          const completedCount = ex.sessions.filter((s) => s.status === "completed").length;
          ex.completedSessions = completedCount;
          const total = ex.totalSessions || ex.sessions.length || 4;
          ex.progress = Math.min(100, Math.round((completedCount / total) * 100));
          if (ex.progress === 100) {
            ex.status = "completed";
            if (ex.agreement) ex.agreement.status = "completed";
          }
          saveUserExchanges(state.exchanges);
        }
      }
    },
    submitExchangeReview(state, action) {
      const { exchangeId, rating, review } = action.payload;
      const ex = state.exchanges.find((e) => e.id === exchangeId || e._id === exchangeId);
      if (ex) {
        ex.rating = rating;
        ex.review = review;
        ex.status = "completed";
        ex.progress = 100;
        if (ex.agreement) ex.agreement.status = "completed";
        saveUserExchanges(state.exchanges);
      }
    },
    completeExchange(state, action) {
      const ex = state.exchanges.find((e) => e.id === action.payload || e._id === action.payload);
      if (ex) {
        ex.status = "completed";
        ex.progress = 100;
        if (ex.agreement) ex.agreement.status = "completed";
        saveUserExchanges(state.exchanges);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Exchanges Async
      .addCase(fetchExchangesAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchExchangesAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.exchanges = action.payload;
          saveUserExchanges(action.payload);
        }
      })
      .addCase(fetchExchangesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Exchange Async
      .addCase(createExchangeAsync.fulfilled, (state, action) => {
        state.exchanges.unshift(action.payload);
        saveUserExchanges(state.exchanges);
      })
      // Accept Exchange Async
      .addCase(acceptExchangeAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        state.exchanges = state.exchanges.map((e) => (e.id === updated.id || e._id === updated._id ? updated : e));
        saveUserExchanges(state.exchanges);
      })
      // Reject Exchange Async
      .addCase(rejectExchangeAsync.fulfilled, (state, action) => {
        const id = action.payload;
        state.exchanges = state.exchanges.map((e) => (e.id === id || e._id === id ? { ...e, status: "cancelled" } : e));
        saveUserExchanges(state.exchanges);
      })
      // Complete Session Async
      .addCase(completeExchangeSessionAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        state.exchanges = state.exchanges.map((e) => (e.id === updated.id || e._id === updated._id ? updated : e));
        saveUserExchanges(state.exchanges);
      })
      // Submit Review Async
      .addCase(submitExchangeReviewAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        state.exchanges = state.exchanges.map((e) => (e.id === updated.id || e._id === updated._id ? updated : e));
        saveUserExchanges(state.exchanges);
      })
      // Legacy user actions
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.exchanges = getExchangesForUser(uid);
        } else {
          state.exchanges = [];
        }
      })
      .addCase("user/loginUserAsync/fulfilled", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.exchanges = getExchangesForUser(uid);
        } else {
          state.exchanges = [];
        }
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        if (user) {
          const uid = String(user.id || user._id);
          state.exchanges = [];
          saveStorage(`skillbridge_exchanges_${uid}`, []);
        }
      })
      .addCase("user/registerUserAsync/fulfilled", (state) => {
        state.exchanges = [];
      })
      .addCase("user/logoutUser", (state) => {
        state.exchanges = [];
      });
  },
});

export const {
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelExchange,
  completeExchange,
  completeExchangeSession,
  submitExchangeReview,
} = exchangeSlice.actions;

export default exchangeSlice.reducer;
