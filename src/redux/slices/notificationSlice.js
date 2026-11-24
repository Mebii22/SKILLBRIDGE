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

const getNotificationsForUser = (userId) => {
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
export const fetchNotificationsAsync = createAsyncThunk(
  "notifications/fetchNotificationsAsync",
  async (params, { rejectWithValue }) => {
    try {
      const res = await API.get("/notifications", { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch notifications");
    }
  }
);

export const markNotificationReadAsync = createAsyncThunk(
  "notifications/markNotificationReadAsync",
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.put(`/notifications/${id}/read`);
      return { id, unreadCount: res.data.unreadCount };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark as read");
    }
  }
);

export const markAllNotificationsReadAsync = createAsyncThunk(
  "notifications/markAllNotificationsReadAsync",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.put("/notifications/read-all");
      return res.data.unreadCount ?? 0;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark all as read");
    }
  }
);

export const deleteNotificationAsync = createAsyncThunk(
  "notifications/deleteNotificationAsync",
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.delete(`/notifications/${id}`);
      return { id, unreadCount: res.data.unreadCount };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete notification");
    }
  }
);

export const clearAllNotificationsAsync = createAsyncThunk(
  "notifications/clearAllNotificationsAsync",
  async (_, { rejectWithValue }) => {
    try {
      await API.delete("/notifications/clear-all");
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to clear notifications");
    }
  }
);

export const fetchUnreadCountAsync = createAsyncThunk(
  "notifications/fetchUnreadCountAsync",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/notifications/unread-count");
      return res.data.unreadCount ?? 0;
    } catch (err) {
      return rejectWithValue(0);
    }
  }
);

const initialNotifications = (() => {
  const uid = getUserId();
  return getNotificationsForUser(uid);
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
      const payload = action.payload || {};
      const newId = payload.id || payload._id || Date.now();
      state.items.unshift({
        id: newId,
        _id: newId,
        read: false,
        time: "Just now",
        ...payload,
      });
      state.unreadCount += 1;
      saveUserNotifications(state.items);
    },
    markRead(state, action) {
      const idStr = String(action.payload);
      const n = state.items.find((i) => String(i.id || i._id) === idStr);
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
    deleteNotificationLocal(state, action) {
      const idStr = String(action.payload);
      const target = state.items.find((i) => String(i.id || i._id) === idStr);
      if (target && !target.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.items = state.items.filter((i) => String(i.id || i._id) !== idStr);
      saveUserNotifications(state.items);
    },
    clearNotificationState(state) {
      state.items = [];
      state.unreadCount = 0;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications Async
      .addCase(fetchNotificationsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationsAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.notifications) {
          state.items = action.payload.notifications;
          state.unreadCount = action.payload.unreadCount ?? action.payload.notifications.filter((n) => !n.read).length;
          saveUserNotifications(action.payload.notifications);
        }
      })
      .addCase(fetchNotificationsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark Read Async
      .addCase(markNotificationReadAsync.fulfilled, (state, action) => {
        const { id, unreadCount } = action.payload || {};
        const idStr = String(id);
        const n = state.items.find((i) => String(i.id || i._id) === idStr);
        if (n && !n.read) {
          n.read = true;
        }
        if (typeof unreadCount === "number") {
          state.unreadCount = unreadCount;
        } else {
          state.unreadCount = state.items.filter((item) => !item.read).length;
        }
        saveUserNotifications(state.items);
      })
      // Mark All Read Async
      .addCase(markAllNotificationsReadAsync.fulfilled, (state, action) => {
        state.items.forEach((n) => {
          n.read = true;
        });
        state.unreadCount = typeof action.payload === "number" ? action.payload : 0;
        saveUserNotifications(state.items);
      })
      // Delete Notification Async
      .addCase(deleteNotificationAsync.fulfilled, (state, action) => {
        const { id, unreadCount } = action.payload || {};
        const idStr = String(id);
        state.items = state.items.filter((i) => String(i.id || i._id) !== idStr);
        if (typeof unreadCount === "number") {
          state.unreadCount = unreadCount;
        } else {
          state.unreadCount = state.items.filter((item) => !item.read).length;
        }
        saveUserNotifications(state.items);
      })
      // Clear All Notifications Async
      .addCase(clearAllNotificationsAsync.fulfilled, (state) => {
        state.items = [];
        state.unreadCount = 0;
        saveUserNotifications([]);
      })
      // Fetch Unread Count Async
      .addCase(fetchUnreadCountAsync.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      // Account isolation: clear state on login/logout
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.items = getNotificationsForUser(uid);
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
          state.items = getNotificationsForUser(uid);
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
      })
      .addCase("user/logoutUserAsync/fulfilled", (state) => {
        state.items = [];
        state.unreadCount = 0;
      });
  },
});

export const {
  addNotification,
  markRead,
  markAllRead,
  deleteNotificationLocal,
  clearNotificationState
} = notificationSlice.actions;

export default notificationSlice.reducer;
