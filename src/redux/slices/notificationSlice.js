import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/client.js";
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
  return u ? String(u.id || u._id) : null;
};

const getNotificationsForUser = (userId, userName = "Learner") => {
  if (!userId) return [];
  const existing = loadStorage(`skillbridge_notifications_${userId}`, null);
  if (existing && Array.isArray(existing)) return existing;
  return [];
};

const saveUserNotifications = (items) => {
  const uid = getUserId();
  if (uid) {
    saveStorage(`skillbridge_notifications_${uid}`, items);
  }
};

// ASYNC THUNKS
export const fetchNotificationsAsync = createAsyncThunk("notifications/fetchNotificationsAsync", async (_, { rejectWithValue }) => {
  try {
    const res = await API.get("/notifications");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch notifications");
  }
});

export const markNotificationReadAsync = createAsyncThunk("notifications/markReadAsync", async (id, { rejectWithValue }) => {
  try {
    await API.put(`/notifications/${id}/read`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to mark as read");
  }
});

export const markAllNotificationsReadAsync = createAsyncThunk("notifications/markAllReadAsync", async (_, { rejectWithValue }) => {
  try {
    await API.put("/notifications/read-all");
    return true;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to mark all as read");
  }
});

export const deleteNotificationAsync = createAsyncThunk("notifications/deleteNotificationAsync", async (id, { rejectWithValue }) => {
  try {
    await API.delete(`/notifications/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete notification");
  }
});

const initialNotifications = (() => {
  const u = loadStorage("currentUser", null);
  const uid = u ? String(u.id || u._id) : "1";
  return getNotificationsForUser(uid, u?.name);
})();

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    items: initialNotifications,
    unreadCount: initialNotifications.filter((n) => !n.read).length,
    loading: false,
    error: null,
  },
  reducers: {
    addNotification(state, action) {
      state.items.unshift({
        id: Date.now(),
        read: false,
        time: "Just now",
        ...action.payload,
      });
      state.unreadCount += 1;
      saveUserNotifications(state.items);
    },
    markRead(state, action) {
      const n = state.items.find((i) => i.id === action.payload || i._id === action.payload);
      if (n && !n.read) {
        n.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        saveUserNotifications(state.items);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
      saveUserNotifications(state.items);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications Async
      .addCase(fetchNotificationsAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotificationsAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.notifications) {
          state.items = action.payload.notifications;
          state.unreadCount = action.payload.unreadCount || 0;
          saveUserNotifications(action.payload.notifications);
        }
      })
      .addCase(fetchNotificationsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark Read Async
      .addCase(markNotificationReadAsync.fulfilled, (state, action) => {
        const id = action.payload;
        const n = state.items.find((i) => i.id === id || i._id === id);
        if (n && !n.read) {
          n.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      // Mark All Read Async
      .addCase(markAllNotificationsReadAsync.fulfilled, (state) => {
        state.items.forEach((n) => {
          n.read = true;
        });
        state.unreadCount = 0;
      })
      // Legacy user actions
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.items = getNotificationsForUser(uid, user.name || "Learner");
          state.unreadCount = state.items.filter((n) => !n.read).length;
        } else {
          state.items = [];
          state.unreadCount = 0;
        }
      })
      .addCase("user/loginUserAsync/fulfilled", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.items = getNotificationsForUser(uid, user.name || "Learner");
          state.unreadCount = state.items.filter((n) => !n.read).length;
        } else {
          state.items = [];
          state.unreadCount = 0;
        }
      })
      .addCase("user/registerUser", (state) => {
        state.items = [];
        state.unreadCount = 0;
      })
      .addCase("user/registerUserAsync/fulfilled", (state) => {
        state.items = [];
        state.unreadCount = 0;
      })
      .addCase("user/logoutUser", (state) => {
        state.items = [];
        state.unreadCount = 0;
      });
  },
});

export const { addNotification, markRead, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
