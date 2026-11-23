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

// ASYNC THUNKS (Real Backend Integration)
export const loginUserAsync = createAsyncThunk("user/loginUserAsync", async (credentials, { rejectWithValue }) => {
  try {
    const res = await API.post("/auth/login", credentials);
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userLoggedIn", "true");
      saveStorage("currentUser", res.data.user);
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

export const fetchMeAsync = createAsyncThunk("user/fetchMeAsync", async (_, { rejectWithValue }) => {
  try {
    const res = await API.get("/auth/me");
    saveStorage("currentUser", res.data.user);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user");
  }
});

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
    saveStorage("currentUser", res.data.user);
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

// Current logged in user
const initialCurrentUser = (() => {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const loggedIn = loadStorage("userLoggedIn", false);
  if (!loggedIn || !token) return null;
  const storedUser = loadStorage("currentUser", null);
  if (storedUser) {
    return storedUser;
  }
  return null;
})();

const initialState = {
  currentUser: initialCurrentUser,
  users: initialUsers,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginUser(state, action) {
      const user = action.payload;
      if (!user) return;
      state.currentUser = user;
      saveStorage("userLoggedIn", true);
      saveStorage("currentUser", user);
    },
    logoutUser(state) {
      state.currentUser = null;
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("currentUser");
      } catch (e) {
        console.error(e);
      }
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
      saveStorage("currentUser", updated);
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
      .addCase(fetchMeAsync.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      })
      .addCase(fetchMeAsync.rejected, (state) => {
        state.currentUser = null;
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("userLoggedIn");
          localStorage.removeItem("currentUser");
        } catch (e) {
          console.error(e);
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
          try {
            localStorage.removeItem("userLoggedIn");
            localStorage.removeItem("currentUser");
            localStorage.removeItem("token");
          } catch (e) {
            console.error(e);
          }
        }
      });
  },
});

export const { loginUser, logoutUser, registerUser, updateUser, toggleUserStatus, deleteUser, addReviewToUser } = userSlice.actions;
export default userSlice.reducer;
