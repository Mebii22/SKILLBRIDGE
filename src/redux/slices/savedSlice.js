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

const getSavedForUser = (userId) => {
  if (!userId) return [];
  const existing = loadStorage(`skillbridge_saved_${userId}`, null);
  if (existing && Array.isArray(existing)) return existing;
  return [];
};

const saveUserSaved = (savedIds) => {
  const uid = getUserId();
  if (uid) {
    saveStorage(`skillbridge_saved_${uid}`, savedIds);
  }
};

// ASYNC THUNKS
export const fetchSavedProfilesAsync = createAsyncThunk("saved/fetchSavedProfilesAsync", async (_, { rejectWithValue }) => {
  try {
    const res = await API.get("/users/saved/all");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch saved profiles");
  }
});

export const toggleSavedAsync = createAsyncThunk("saved/toggleSavedAsync", async (targetId, { rejectWithValue }) => {
  try {
    const res = await API.post(`/users/saved/${targetId}`);
    return { targetId, saved: res.data.saved, savedIds: res.data.savedIds };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update saved profile");
  }
});

const initialSaved = (() => {
  const uid = getUserId();
  return getSavedForUser(uid);
})();

const savedSlice = createSlice({
  name: "saved",
  initialState: {
    savedIds: initialSaved,
    savedUsers: [],
    loading: false,
    error: null,
  },
  reducers: {
    toggleSaved(state, action) {
      const id = String(action.payload);
      if (state.savedIds.map(String).includes(id)) {
        state.savedIds = state.savedIds.filter((s) => String(s) !== id);
      } else {
        state.savedIds.push(action.payload);
      }
      saveUserSaved(state.savedIds);
    },
    removeSaved(state, action) {
      const id = String(action.payload);
      state.savedIds = state.savedIds.filter((s) => String(s) !== id);
      saveUserSaved(state.savedIds);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Saved Profiles Async
      .addCase(fetchSavedProfilesAsync.fulfilled, (state, action) => {
        state.savedIds = action.payload.savedIds || [];
        state.savedUsers = action.payload.savedUsers || [];
        saveUserSaved(action.payload.savedIds);
      })
      // Toggle Saved Async
      .addCase(toggleSavedAsync.fulfilled, (state, action) => {
        const { targetId, saved } = action.payload;
        const idStr = String(targetId);
        if (saved) {
          if (!state.savedIds.map(String).includes(idStr)) {
            state.savedIds.push(targetId);
          }
        } else {
          state.savedIds = state.savedIds.filter((s) => String(s) !== idStr);
          state.savedUsers = state.savedUsers.filter((u) => String(u.id || u._id) !== idStr);
        }
        saveUserSaved(state.savedIds);
      })
      // Legacy user actions
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.savedIds = getSavedForUser(uid);
        } else {
          state.savedIds = [];
        }
      })
      .addCase("user/loginUserAsync/fulfilled", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.savedIds = getSavedForUser(uid);
        } else {
          state.savedIds = [];
        }
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        if (user) {
          const uid = String(user.id || user._id);
          state.savedIds = [];
          saveStorage(`skillbridge_saved_${uid}`, []);
        }
      })
      .addCase("user/registerUserAsync/fulfilled", (state) => {
        state.savedIds = [];
      })
      .addCase("user/logoutUser", (state) => {
        state.savedIds = [];
        state.savedUsers = [];
      });
  },
});

export const { toggleSaved, removeSaved } = savedSlice.actions;
export default savedSlice.reducer;
