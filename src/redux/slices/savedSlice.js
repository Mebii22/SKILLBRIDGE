import { createSlice } from "@reduxjs/toolkit";

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

const getSavedForUser = (userId) => {
  if (!userId || userId === "1") {
    const existing = loadStorage("skillbridge_saved_1", null) || loadStorage("savedProfiles", null);
    if (existing && Array.isArray(existing)) return existing;
    saveStorage("skillbridge_saved_1", [2]);
    saveStorage("savedProfiles", [2]);
    return [2];
  }
  return loadStorage(`skillbridge_saved_${userId}`, []);
};

const saveUserSaved = (savedIds) => {
  const uid = getUserId();
  saveStorage(`skillbridge_saved_${uid}`, savedIds);
  if (uid === "1") {
    saveStorage("savedProfiles", savedIds);
  }
};

const initialSaved = (() => {
  const uid = getUserId();
  return getSavedForUser(uid);
})();

const savedSlice = createSlice({
  name: "saved",
  initialState: { savedIds: initialSaved },
  reducers: {
    toggleSaved(state, action) {
      const id = action.payload;
      if (state.savedIds.includes(id)) {
        state.savedIds = state.savedIds.filter((s) => s !== id);
      } else {
        state.savedIds.push(id);
      }
      saveUserSaved(state.savedIds);
    },
    removeSaved(state, action) {
      state.savedIds = state.savedIds.filter((s) => s !== action.payload);
      saveUserSaved(state.savedIds);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload || { id: 1 };
        const uid = String(user.id);
        state.savedIds = getSavedForUser(uid);
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        const uid = user ? String(user.id) : Date.now().toString();
        state.savedIds = [];
        saveStorage(`skillbridge_saved_${uid}`, []);
      })
      .addCase("user/logoutUser", (state) => {
        state.savedIds = [2];
      });
  },
});

export const { toggleSaved, removeSaved } = savedSlice.actions;
export default savedSlice.reducer;
