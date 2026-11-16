import { createSlice } from "@reduxjs/toolkit";
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

// Seed registered accounts if not present
const initialAccounts = (() => {
  const existing = loadStorage("skillbridge_registered_accounts", null);
  if (existing && Array.isArray(existing)) {
    // Sanitize any old dummy profile handles if left over
    let changed = false;
    const sanitized = existing.map((a) => {
      if (a.user?.socials?.linkedin === "mebin-joseph") {
        changed = true;
        return { ...a, user: { ...a.user, socials: { ...a.user.socials, linkedin: "" } } };
      }
      return a;
    });
    if (changed) saveStorage("skillbridge_registered_accounts", sanitized);
    return sanitized;
  }
  const seeded = [
    {
      email: defaultMebin.email.toLowerCase(),
      password: "password123",
      user: defaultMebin,
    },
  ];
  saveStorage("skillbridge_registered_accounts", seeded);
  return seeded;
})();

// Community users
const initialUsers = (() => {
  const existing = loadStorage("skillbridge_users", null);
  if (existing && Array.isArray(existing)) return existing;
  saveStorage("skillbridge_users", defaultUsers);
  return defaultUsers;
})();

// Current logged in user
const initialCurrentUser = (() => {
  const loggedIn = loadStorage("userLoggedIn", false);
  if (!loggedIn) return null;
  const storedUser = loadStorage("currentUser", null);
  if (storedUser) {
    if (storedUser.socials?.linkedin === "mebin-joseph") {
      storedUser.socials.linkedin = "";
      saveStorage("currentUser", storedUser);
    }
    return storedUser;
  }
  return defaultMebin;
})();

const initialState = {
  currentUser: initialCurrentUser,
  users: initialUsers,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginUser(state, action) {
      const user = action.payload || defaultMebin;
      state.currentUser = user;
      saveStorage("userLoggedIn", true);
      saveStorage("currentUser", user);
    },
    logoutUser(state) {
      state.currentUser = null;
      try {
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("currentUser");
      } catch (e) {
        console.error(e);
      }
    },
    registerUser(state, action) {
      const { account, user } = action.payload;
      // 1. Add to community users
      state.users.unshift(user);
      saveStorage("skillbridge_users", state.users);

      // 2. Add to registered accounts
      const accounts = loadStorage("skillbridge_registered_accounts", []);
      const updatedAccounts = [
        { email: account.email.toLowerCase(), password: account.password, user },
        ...accounts.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase()),
      ];
      saveStorage("skillbridge_registered_accounts", updatedAccounts);

      // 3. Set current user
      state.currentUser = user;
      saveStorage("userLoggedIn", true);
      saveStorage("currentUser", user);
    },
    updateUser(state, action) {
      const updated = { ...state.currentUser, ...action.payload };
      state.currentUser = updated;
      saveStorage("currentUser", updated);

      // Update in community users list
      state.users = state.users.map((u) => (u.id === updated.id || u.email === updated.email ? { ...u, ...updated } : u));
      saveStorage("skillbridge_users", state.users);

      // Update in registered accounts
      const accounts = loadStorage("skillbridge_registered_accounts", []);
      const updatedAccounts = accounts.map((a) =>
        a.email.toLowerCase() === updated.email.toLowerCase() ? { ...a, user: { ...a.user, ...updated } } : a
      );
      saveStorage("skillbridge_registered_accounts", updatedAccounts);
    },
    toggleUserStatus(state, action) {
      const id = action.payload;
      state.users = state.users.map((u) => {
        if (u.id === id) {
          const newStatus = u.status === "Active" ? "Disabled" : "Active";
          return { ...u, status: newStatus };
        }
        return u;
      });
      saveStorage("skillbridge_users", state.users);

      // If current user is toggled
      if (state.currentUser && state.currentUser.id === id) {
        state.currentUser.status = state.currentUser.status === "Active" ? "Disabled" : "Active";
        saveStorage("currentUser", state.currentUser);
      }

      // Update in registered accounts
      const targetUser = state.users.find((u) => u.id === id);
      if (targetUser) {
        const accounts = loadStorage("skillbridge_registered_accounts", []);
        const updatedAccounts = accounts.map((a) =>
          a.email.toLowerCase() === targetUser.email.toLowerCase()
            ? { ...a, user: { ...a.user, status: targetUser.status } }
            : a
        );
        saveStorage("skillbridge_registered_accounts", updatedAccounts);
      }
    },
    deleteUser(state, action) {
      const id = action.payload;
      const targetUser = state.users.find((u) => u.id === id);
      state.users = state.users.filter((u) => u.id !== id);
      saveStorage("skillbridge_users", state.users);

      if (targetUser) {
        const accounts = loadStorage("skillbridge_registered_accounts", []);
        const filteredAccounts = accounts.filter((a) => a.email.toLowerCase() !== targetUser.email.toLowerCase());
        saveStorage("skillbridge_registered_accounts", filteredAccounts);
      }

      if (state.currentUser && state.currentUser.id === id) {
        state.currentUser = null;
        if (isBrowser) {
          localStorage.removeItem("userLoggedIn");
          localStorage.removeItem("currentUser");
        }
      }
    },
    addReviewToUser(state, action) {
      const { userId, partnerName, review } = action.payload;
      const targetUser = state.users.find((u) => u.id === userId || u.name === partnerName);
      if (targetUser) {
        if (!targetUser.reviews) targetUser.reviews = [];
        targetUser.reviews.unshift(review);
        targetUser.completed = (targetUser.completed || 0) + 1;
        // Recalculate average rating
        const totalRating = targetUser.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
        targetUser.rating = Number((totalRating / targetUser.reviews.length).toFixed(1));
        saveStorage("skillbridge_users", state.users);
      }
    },
  },
});

export const { loginUser, logoutUser, registerUser, updateUser, toggleUserStatus, deleteUser, addReviewToUser } = userSlice.actions;
export default userSlice.reducer;
