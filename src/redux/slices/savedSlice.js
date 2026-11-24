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
  if (existing && Array.isArray(existing)) return existing.map(String);
  return [];
};

const saveUserSaved = (savedIds) => {
  const uid = getUserId();
  if (uid && Array.isArray(savedIds)) {
    saveStorage(`skillbridge_saved_${uid}`, savedIds.map(String));
  }
};

// ASYNC THUNKS
export const fetchSavedProfilesAsync = createAsyncThunk(
  "saved/fetchSavedProfilesAsync",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/users/saved/all");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch saved profiles");
    }
  }
);

export const toggleSavedAsync = createAsyncThunk(
  "saved/toggleSavedAsync",
  async (targetId, { rejectWithValue }) => {
    try {
      const res = await API.post(`/users/saved/${targetId}`);
      return { targetId, saved: res.data.saved, savedIds: res.data.savedIds };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update saved profile");
    }
  }
);

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
        state.savedUsers = state.savedUsers.filter((u) => String(u.id || u._id) !== id);
      } else {
        state.savedIds.push(id);
      }
      saveUserSaved(state.savedIds);
    },
    removeSaved(state, action) {
      const id = String(action.payload);
      state.savedIds = state.savedIds.filter((s) => String(s) !== id);
      state.savedUsers = state.savedUsers.filter((u) => String(u.id || u._id) !== id);
      saveUserSaved(state.savedIds);
    },
    clearSavedState(state) {
      state.savedIds = [];
      state.savedUsers = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Saved Profiles Async
      .addCase(fetchSavedProfilesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedProfilesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.savedIds = (action.payload.savedIds || []).map(String);
        state.savedUsers = action.payload.savedUsers || [];
        saveUserSaved(state.savedIds);
      })
      .addCase(fetchSavedProfilesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Toggle Saved Async
      .addCase(toggleSavedAsync.fulfilled, (state, action) => {
        const { targetId, saved, savedIds } = action.payload;
        const idStr = String(targetId);
        if (savedIds && Array.isArray(savedIds)) {
          state.savedIds = savedIds.map(String);
        } else if (saved) {
          if (!state.savedIds.map(String).includes(idStr)) {
            state.savedIds.push(idStr);
          }
        } else {
          state.savedIds = state.savedIds.filter((s) => String(s) !== idStr);
          state.savedUsers = state.savedUsers.filter((u) => String(u.id || u._id) !== idStr);
        }
        saveUserSaved(state.savedIds);
      })
      .addCase(toggleSavedAsync.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Account lifecycle actions
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.savedIds = getSavedForUser(uid);
        } else {
          state.savedIds = [];
        }
        state.savedUsers = [];
      })
      .addCase("user/loginUserAsync/fulfilled", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.savedIds = getSavedForUser(uid);
        } else {
          state.savedIds = [];
        }
        state.savedUsers = [];
      })
      .addCase("user/logoutUser", (state) => {
        state.savedIds = [];
        state.savedUsers = [];
        state.loading = false;
        state.error = null;
      })
      .addCase("user/logoutUserAsync/fulfilled", (state) => {
        state.savedIds = [];
        state.savedUsers = [];
        state.loading = false;
        state.error = null;
      });
  },
});

export const { toggleSaved, removeSaved, clearSavedState } = savedSlice.actions;
export default savedSlice.reducer;
