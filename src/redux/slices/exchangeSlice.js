import { createSlice } from "@reduxjs/toolkit";
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
  return u ? String(u.id) : "1";
};

const getExchangesForUser = (userId) => {
  if (!userId || userId === "1") {
    const existing = loadStorage("skillbridge_exchanges_1", null) || loadStorage("skillbridge_exchanges", null);
    if (existing && Array.isArray(existing)) return existing;
    saveStorage("skillbridge_exchanges_1", dummyExchanges);
    saveStorage("skillbridge_exchanges", dummyExchanges);
    return dummyExchanges;
  }
  return loadStorage(`skillbridge_exchanges_${userId}`, []);
};

const saveUserExchanges = (exchanges) => {
  const uid = getUserId();
  saveStorage(`skillbridge_exchanges_${uid}`, exchanges);
  if (uid === "1") {
    saveStorage("skillbridge_exchanges", exchanges);
  }
};

const initialExchanges = (() => {
  const uid = getUserId();
  return getExchangesForUser(uid);
})();

const exchangeSlice = createSlice({
  name: "exchanges",
  initialState: { exchanges: initialExchanges },
  reducers: {
    sendRequest(state, action) {
      const payload = action.payload || {};
      const totalSessions = Number(payload.totalSessions) || 4;
      const mode = payload.mode || "Online";
      const duration = payload.duration || "1 Hour";
      const schedule = payload.schedule || "Weekly on mutually agreed time";
      const location = payload.meetingLocation || (mode === "Offline" ? "Public Library / Cafe" : "");
      const meetingLink = payload.meetingLink || (mode === "Online" ? "https://meet.google.com/sb-learn-hub" : "");

      // Generate default session schedule plan
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
      const ex = state.exchanges.find((e) => e.id === action.payload);
      if (ex) {
        ex.status = "active";
        if (ex.agreement) {
          ex.agreement.status = "active";
          ex.agreement.acceptedAt = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        if (!ex.sessions || ex.sessions.length === 0) {
          const totalSessions = Number(ex.totalSessions) || 4;
          ex.sessions = Array.from({ length: totalSessions }, (_, idx) => {
            const num = idx + 1;
            return {
              id: Date.now() + num,
              sessionNum: num,
              title: `Session ${num}: ${num % 2 === 1 ? ex.teach : ex.want}`,
              date: new Date(Date.now() + num * 7 * 86400000).toISOString().split("T")[0],
              time: "5:00 PM",
              duration: ex.duration || "1 Hour",
              topic: num === 1 ? "Fundamentals & Roadmap" : "Deep Dive & Hands-on Exercises",
              mode: ex.mode || "Online",
              meetingLink: ex.mode === "Offline" ? undefined : (ex.agreement?.meetingLink || "https://meet.google.com/sb-learn-hub"),
              meetingLocation: ex.mode === "Offline" ? (ex.agreement?.location || "Public Library / Cafe") : undefined,
              status: "upcoming",
            };
          });
        }
        saveUserExchanges(state.exchanges);
      }
    },
    rejectRequest(state, action) {
      const ex = state.exchanges.find((e) => e.id === action.payload);
      if (ex) {
        ex.status = "cancelled";
        if (ex.agreement) ex.agreement.status = "cancelled";
        saveUserExchanges(state.exchanges);
      }
    },
    cancelExchange(state, action) {
      const ex = state.exchanges.find((e) => e.id === action.payload);
      if (ex) {
        ex.status = "cancelled";
        if (ex.agreement) ex.agreement.status = "cancelled";
        saveUserExchanges(state.exchanges);
      }
    },
    completeExchangeSession(state, action) {
      const { exchangeId, sessionId } = action.payload;
      const ex = state.exchanges.find((e) => e.id === exchangeId);
      if (ex && ex.sessions) {
        const session = ex.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.status = "completed";
          const completedCount = ex.sessions.filter((s) => s.status === "completed").length;
          ex.completedSessions = completedCount;
          const total = ex.totalSessions || ex.sessions.length || 4;
          ex.progress = Math.min(100, Math.round((completedCount / total) * 100));

          // update next upcoming session
          const next = ex.sessions.find((s) => s.status === "upcoming");
          if (next) {
            ex.nextSession = {
              date: next.date,
              time: next.time,
              skill: next.title,
              mode: next.mode,
              meetingLink: next.meetingLink,
              meetingLocation: next.meetingLocation,
            };
          } else {
            ex.nextSession = null;
            ex.status = "completed";
            if (ex.agreement) ex.agreement.status = "completed";
          }
          saveUserExchanges(state.exchanges);
        }
      }
    },
    submitExchangeReview(state, action) {
      const { exchangeId, rating, review } = action.payload;
      const ex = state.exchanges.find((e) => e.id === exchangeId);
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
      const ex = state.exchanges.find((e) => e.id === action.payload);
      if (ex) {
        ex.status = "completed";
        ex.progress = 100;
        if (ex.agreement) ex.agreement.status = "completed";
        if (ex.sessions) {
          ex.sessions.forEach((s) => {
            s.status = "completed";
          });
        }
        ex.completedSessions = ex.totalSessions || 4;
        saveUserExchanges(state.exchanges);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload || { id: 1 };
        const uid = String(user.id);
        state.exchanges = getExchangesForUser(uid);
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        const uid = user ? String(user.id) : Date.now().toString();
        state.exchanges = [];
        saveStorage(`skillbridge_exchanges_${uid}`, []);
      })
      .addCase("user/logoutUser", (state) => {
        state.exchanges = dummyExchanges;
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
