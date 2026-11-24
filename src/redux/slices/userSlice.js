import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/client.js";
import { currentUser as defaultMebin, users as defaultUsers } from "../../data/dummyData.js";

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

// Storage management for Remember Me (localStorage vs sessionStorage)
export const saveAuthStorage = (token, user, remember = true) => {
  try {
    const primaryStorage = remember ? localStorage : sessionStorage;
    const secondaryStorage = remember ? sessionStorage : localStorage;

    // Purge stale credentials from alternate storage to prevent conflicting states
    secondaryStorage.removeItem("token");
    secondaryStorage.removeItem("userLoggedIn");
    secondaryStorage.removeItem("currentUser");

    // Persist active session in primary storage
    if (token) primaryStorage.setItem("token", token);
    primaryStorage.setItem("userLoggedIn", "true");
    if (user) primaryStorage.setItem("currentUser", JSON.stringify(user));
  } catch (e) {
    console.error("Failed to save auth storage:", e);
  }
};

export const clearAuthStorage = () => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userLoggedIn");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("user");
      localStorage.removeItem("adminLoggedIn");
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userLoggedIn");
      sessionStorage.removeItem("currentUser");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("adminLoggedIn");
    }
  } catch (e) {
    console.error("Failed to clear auth storage:", e);
  }
};

const updateActiveStorageUser = (user) => {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("currentUser")) {
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("currentUser")) {
      sessionStorage.setItem("currentUser", JSON.stringify(user));
    }
  } catch (e) {
    console.error("Failed to update active storage user:", e);
  }
};

// ASYNC THUNKS (Real Backend Integration)
export const loginUserAsync = createAsyncThunk("user/loginUserAsync", async (credentials, { rejectWithValue }) => {
  try {
    const { email, password, remember = true } = credentials;
    const res = await API.post("/auth/login", { email, password });
    if (res.data.token) {
      saveAuthStorage(res.data.token, res.data.user, remember);
    }
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const registerUserAsync = createAsyncThunk("user/registerUserAsync", async (userData, { rejectWithValue }) => {
  try {
    const res = await API.post("/auth/register", userData);
    // Registration only creates the account; do not auto-login or store token
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Registration failed");
  }
});

export const fetchMeAsync = createAsyncThunk(
  "user/fetchMeAsync",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/auth/me");
      updateActiveStorageUser(res.data.user);
      return res.data.user;
    } catch (err) {
      const status = err.response ? err.response.status : null;
      const message = err.response?.data?.message || err.message || "Failed to fetch user";
      return rejectWithValue({ status, message });
    }
  },
  {
    condition: (force, { getState }) => {
      const token =
        (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
        null;
      if (!token) return false;
      if (force === true) return true;
      const state = getState();
      if (state.user?.authInFlight) {
        return false;
      }
      return true;
    },
  }
);

export const fetchUsersAsync = createAsyncThunk("user/fetchUsersAsync", async (queryParams, { rejectWithValue }) => {
  try {
    const res = await API.get("/users", { params: queryParams });
    return res.data.users;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch users");
  }
});

export const updateUserAsync = createAsyncThunk("user/updateUserAsync", async (profileData, { rejectWithValue }) => {
  try {
    const res = await API.put("/users/profile", profileData);
    updateActiveStorageUser(res.data.user);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update profile");
  }
});

export const toggleUserStatusAsync = createAsyncThunk("user/toggleUserStatusAsync", async (userId, { rejectWithValue }) => {
  try {
    const res = await API.patch(`/admin/users/${userId}/toggle-status`);
    return { id: userId, status: res.data.user.status };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to toggle status");
  }
});

export const deleteUserAsync = createAsyncThunk("user/deleteUserAsync", async (userId, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const currentUserId = state.user?.currentUser?._id || state.user?.currentUser?.id;
    const isSelf = currentUserId && (String(currentUserId) === String(userId));
    if (isSelf) {
      await API.delete("/users/account");
    } else {
      await API.delete(`/admin/users/${userId}`);
    }
    return userId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete user");
  }
});

// Community users initial state
const initialUsers = (() => {
  const existing = loadStorage("skillbridge_users", null);
  if (existing && Array.isArray(existing)) return existing;
  saveStorage("skillbridge_users", defaultUsers);
  return defaultUsers;
})();

// Current logged in user (hydrates from localStorage or sessionStorage)
const initialCurrentUser = (() => {
  try {
    // 1. Check persistent localStorage (Remember Me checked)
    const localToken = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
    const localLoggedIn = typeof localStorage !== "undefined" ? localStorage.getItem("userLoggedIn") : null;
    if (localToken && localLoggedIn === "true") {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) return JSON.parse(storedUser);
    }

    // 2. Check tab sessionStorage (Remember Me unchecked)
    const sessionToken = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
    const sessionLoggedIn = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userLoggedIn") : null;
    if (sessionToken && sessionLoggedIn === "true") {
      const storedUser = sessionStorage.getItem("currentUser");
      if (storedUser) return JSON.parse(storedUser);
    }
  } catch {
    return null;
  }
  return null;
})();

const hasActiveToken = (() => {
  try {
    const localToken = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
    const sessionToken = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("token") : null;
    return Boolean(localToken || sessionToken);
  } catch {
    return false;
  }
})();

const initialState = {
  currentUser: initialCurrentUser,
  users: initialUsers,
  loading: false,
  error: null,
  authLoading: hasActiveToken && !initialCurrentUser,
  authHydrated: !hasActiveToken || Boolean(initialCurrentUser),
  authInFlight: false,
  authError: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginUser(state, action) {
      const user = action.payload;
      if (!user) return;
      state.currentUser = user;
      state.authLoading = false;
      state.authHydrated = true;
      state.authInFlight = false;
      state.authError = null;
      saveStorage("userLoggedIn", true);
      saveStorage("currentUser", user);
    },
    logoutUser(state) {
      state.currentUser = null;
      state.authLoading = false;
      state.authHydrated = true;
      state.authInFlight = false;
      state.authError = null;
      clearAuthStorage();
    },
    registerUser(state, action) {
      const { user } = action.payload;
      state.users.unshift(user);
      saveStorage("skillbridge_users", state.users);
      state.currentUser = user;
      saveStorage("userLoggedIn", true);
      saveStorage("currentUser", user);
    },
    updateUser(state, action) {
      const updated = { ...state.currentUser, ...action.payload };
      state.currentUser = updated;
      updateActiveStorageUser(updated);
      state.users = state.users.map((u) => (u.id === updated.id || u.email === updated.email ? { ...u, ...updated } : u));
      saveStorage("skillbridge_users", state.users);
    },
    toggleUserStatus(state, action) {
      const id = action.payload;
      state.users = state.users.map((u) => {
        if (u.id === id || u._id === id) {
          const newStatus = u.status === "Active" ? "Disabled" : "Active";
          return { ...u, status: newStatus };
        }
        return u;
      });
      saveStorage("skillbridge_users", state.users);
      if (state.currentUser && (state.currentUser.id === id || state.currentUser._id === id)) {
        state.currentUser.status = state.currentUser.status === "Active" ? "Disabled" : "Active";
        saveStorage("currentUser", state.currentUser);
      }
    },
    deleteUser(state, action) {
      const id = action.payload;
      state.users = state.users.filter((u) => u.id !== id && u._id !== id);
      saveStorage("skillbridge_users", state.users);
      if (state.currentUser && (state.currentUser.id === id || state.currentUser._id === id)) {
        state.currentUser = null;
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
      }
    },
    addReviewToUser(state, action) {
      const { userId, partnerName, review } = action.payload;
      const targetUser = state.users.find((u) => u.id === userId || u._id === userId || u.name === partnerName);
      if (targetUser) {
        if (!targetUser.reviews) targetUser.reviews = [];
        targetUser.reviews.unshift(review);
        targetUser.completed = (targetUser.completed || 0) + 1;
        const totalRating = targetUser.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
        targetUser.rating = Number((totalRating / targetUser.reviews.length).toFixed(1));
        saveStorage("skillbridge_users", state.users);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login Async
      .addCase(loginUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.authLoading = false;
        state.authHydrated = true;
        state.authInFlight = false;
        state.authError = null;
      })
      .addCase(loginUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register Async
      .addCase(registerUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Do NOT authenticate or set currentUser; user must log in manually
        const newUser = action.payload;
        if (newUser && !state.users.some((u) => (u.id || u._id) === (newUser.id || newUser._id))) {
          state.users.unshift(newUser);
        }
      })
      .addCase(registerUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Users
      .addCase(fetchUsersAsync.fulfilled, (state, action) => {
        if (action.payload && action.payload.length > 0) {
          state.users = action.payload;
          saveStorage("skillbridge_users", action.payload);
        }
      })
      // Update User
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.users = state.users.map((u) => (u.id === action.payload.id || u._id === action.payload._id ? action.payload : u));
      })
      // Fetch Me
      .addCase(fetchMeAsync.pending, (state) => {
        if (!state.authHydrated && !state.currentUser) {
          state.authLoading = true;
        }
        state.authInFlight = true;
        state.authError = null;
      })
      .addCase(fetchMeAsync.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.authLoading = false;
        state.authHydrated = true;
        state.authInFlight = false;
        state.authError = null;
      })
      .addCase(fetchMeAsync.rejected, (state, action) => {
        state.authLoading = false;
        state.authHydrated = true;
        state.authInFlight = false;

        const payload = action.payload;
        const status = typeof payload === "object" && payload !== null ? payload.status : null;
        const message = typeof payload === "object" && payload !== null ? payload.message : payload;

        if (status === 401 || status === 403) {
          // Token is definitively invalid, expired, or rejected by server
          state.currentUser = null;
          clearAuthStorage();
          state.authError = message || "Session expired or invalid";
        } else {
          // Network failure, DNS issue, timeout, or 5xx server error
          // Do NOT wipe out stored user or token on a network glitch!
          state.authError = message || "Network error verifying session";
        }
      })
      // Toggle User Status
      .addCase(toggleUserStatusAsync.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        state.users = state.users.map((u) => (u.id === id || u._id === id ? { ...u, status } : u));
      })
      // Delete User
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        const id = action.payload;
        state.users = state.users.filter((u) => u.id !== id && u._id !== id);
        if (state.currentUser && (state.currentUser.id === id || state.currentUser._id === id)) {
          state.currentUser = null;
          clearAuthStorage();
        }
      });
  },
});

export const { loginUser, logoutUser, registerUser, updateUser, toggleUserStatus, deleteUser, addReviewToUser } = userSlice.actions;
export default userSlice.reducer;
