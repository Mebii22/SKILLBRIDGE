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

// ASYNC THUNKS
export const fetchAdminStatsAsync = createAsyncThunk("admin/fetchStatsAsync", async (_, { rejectWithValue }) => {
  try {
    const res = await API.get("/admin/stats");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch admin stats");
  }
});

export const fetchAdminUsersAsync = createAsyncThunk("admin/fetchUsersAsync", async (params = {}, { rejectWithValue }) => {
  try {
    const res = await API.get("/admin/users", { params });
    return res.data.users;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch users");
  }
});

export const toggleAdminUserStatusAsync = createAsyncThunk("admin/toggleUserStatusAsync", async (id, { rejectWithValue }) => {
  try {
    const res = await API.patch(`/admin/users/${id}/status`);
    return res.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update user status");
  }
});

export const deleteAdminUserAsync = createAsyncThunk("admin/deleteUserAsync", async ({ id, reason }, { rejectWithValue }) => {
  try {
    await API.delete(`/admin/users/${id}`, { data: { reason } });
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete user");
  }
});

export const fetchAdminSkillsAsync = createAsyncThunk("admin/fetchSkillsAsync", async (params = {}, { rejectWithValue }) => {
  try {
    const res = await API.get("/admin/skills", { params });
    return res.data.skills;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch admin skills");
  }
});

export const approveSkillAsync = createAsyncThunk("admin/approveSkillAsync", async (id, { rejectWithValue }) => {
  try {
    const res = await API.patch(`/admin/skills/${id}/approve`);
    return res.data.skill;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to approve skill");
  }
});

export const removeSkillAsync = createAsyncThunk("admin/removeSkillAsync", async (payload, { rejectWithValue }) => {
  try {
    let res;
    if (typeof payload === "object" && payload !== null) {
      const { id, userId, skill, type, reason } = payload;
      const skillName = typeof skill === "object" && skill !== null
        ? (skill.skill || skill.name || skill.title || skill.label || "")
        : String(skill || "");

      res = await API.delete("/admin/skills", {
        data: { id, userId, skill: skillName, type, reason }
      });

      return {
        id,
        userId: res.data?.userId || userId,
        type: res.data?.type || type,
        ...res.data,
        skill: res.data?.removedSkill || skillName
      };
    } else {
      res = await API.delete(`/admin/skills/${payload}`);
      return res.data?.skill || { id: payload, _id: payload };
    }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to remove skill");
  }
});

export const restoreSkillAsync = createAsyncThunk("admin/restoreSkillAsync", async (id, { rejectWithValue }) => {
  try {
    const res = await API.patch(`/admin/skills/${id}/restore`);
    return res.data.skill;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to restore skill");
  }
});

export const fetchAdminExchangesAsync = createAsyncThunk("admin/fetchExchangesAsync", async (params = {}, { rejectWithValue }) => {
  try {
    const res = await API.get("/admin/exchanges", { params });
    return res.data.exchanges;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch platform exchanges");
  }
});

export const deleteAdminExchangeAsync = createAsyncThunk("admin/deleteExchangeAsync", async (payload, { rejectWithValue }) => {
  try {
    const id = typeof payload === "object" && payload !== null ? payload.id : payload;
    const reason = typeof payload === "object" && payload !== null ? payload.reason : undefined;
    const res = await API.delete(`/admin/exchanges/${id}`, { data: { reason } });
    return { id, message: res.data.message };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete exchange");
  }
});

export const fetchAdminSessionsAsync = createAsyncThunk("admin/fetchSessionsAsync", async (params = {}, { rejectWithValue }) => {
  try {
    const res = await API.get("/admin/sessions", { params });
    return res.data.sessions;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch platform sessions");
  }
});

export const fetchAdminActivitiesAsync = createAsyncThunk("admin/fetchActivitiesAsync", async (_, { rejectWithValue }) => {
  try {
    const res = await API.get("/admin/activities");
    return res.data.activities;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch admin activity history");
  }
});

export const fetchAdminReportsAsync = createAsyncThunk("admin/fetchReportsAsync", async (_, { rejectWithValue }) => {
  try {
    const res = await API.get("/admin/reports");
    return res.data.reports;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch reports");
  }
});

export const reviewReportAsync = createAsyncThunk("admin/reviewReportAsync", async (id, { rejectWithValue }) => {
  try {
    const res = await API.patch(`/admin/reports/${id}/review`);
    return res.data.report;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to review report");
  }
});

export const resolveReportAsync = createAsyncThunk("admin/resolveReportAsync", async (id, { rejectWithValue }) => {
  try {
    const res = await API.patch(`/admin/reports/${id}/resolve`);
    return res.data.report;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to resolve report");
  }
});

export const deleteAdminReportAsync = createAsyncThunk("admin/deleteReportAsync", async (id, { rejectWithValue }) => {
  try {
    const res = await API.delete(`/admin/reports/${id}`);
    return res.data.id || id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to remove report");
  }
});

export const addSkillListingAsync = createAsyncThunk("admin/addSkillListingAsync", async (payload, { rejectWithValue }) => {
  try {
    const res = await API.post("/skills", payload);
    return res.data.skill;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to share skill");
  }
});

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    users: [],
    skillListings: [],
    reports: [],
    activities: [],
    platformExchanges: [],
    platformSessions: [],
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      disabledUsers: 0,
      totalSkills: 0,
      totalExchanges: 0,
      pendingExchanges: 0,
      completedExchanges: 0,
      activeExchanges: 0,
      totalSessions: 0,
      openReports: 0,
    },
    loading: false,
    error: null,
  },
  reducers: {
    approveSkill(state, action) {
      const listing = state.skillListings.find((l) => l.id === action.payload || l._id === action.payload);
      if (listing) {
        listing.status = "approved";
      }
    },
    removeSkill(state, action) {
      const listing = state.skillListings.find((l) => l.id === action.payload || l._id === action.payload);
      if (listing) {
        listing.status = "removed";
      }
    },
    reviewReport(state, action) {
      const report = state.reports.find((r) => r.id === action.payload || r._id === action.payload);
      if (report) {
        report.status = "reviewed";
      }
    },
    resolveReport(state, action) {
      const report = state.reports.find((r) => r.id === action.payload || r._id === action.payload);
      if (report) {
        report.status = "resolved";
      }
    },
    removeReport(state, action) {
      state.reports = state.reports.filter((r) => r.id !== action.payload && r._id !== action.payload);
    },
    addSkillListing(state, action) {
      state.skillListings.unshift({
        id: Date.now(),
        status: "approved",
        ...action.payload,
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Stats
      .addCase(fetchAdminStatsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminStatsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.stats || state.stats;
        state.platformExchanges = action.payload.exchanges || [];
        if (action.payload.activities && action.payload.activities.length) {
          state.activities = action.payload.activities;
        }
      })
      .addCase(fetchAdminStatsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Admin Users
      .addCase(fetchAdminUsersAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAdminUsersAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload || [];
      })
      .addCase(fetchAdminUsersAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Toggle User Status
      .addCase(toggleAdminUserStatusAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          state.users = state.users.map((u) =>
            (u.id === updated.id || u._id === updated._id ? { ...u, status: updated.status } : u)
          );
        }
      })
      // Delete User Permanent
      .addCase(deleteAdminUserAsync.fulfilled, (state, action) => {
        const id = action.payload;
        state.users = state.users.filter((u) => u.id !== id && u._id !== id);
      })
      // Fetch Skills
      .addCase(fetchAdminSkillsAsync.fulfilled, (state, action) => {
        state.skillListings = action.payload || [];
      })
      // Approve Skill
      .addCase(approveSkillAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          state.skillListings = state.skillListings.map((s) =>
            (s.id === updated.id || s._id === updated._id ? updated : s)
          );
        }
      })
      // Remove Skill
      .addCase(removeSkillAsync.fulfilled, (state, action) => {
        const item = action.payload;
        if (item) {
          const getCleanStr = (val) => {
            if (!val) return "";
            if (typeof val === "string") return val.trim().toLowerCase();
            if (typeof val === "object") {
              const nested = val.skill || val.name || val.title || val.label || "";
              return String(nested).trim().toLowerCase();
            }
            return String(val).trim().toLowerCase();
          };

          const targetSkill = getCleanStr(item.skill || item.removedSkill);
          const targetUserId = item.userId ? String(item.userId) : null;
          const targetType = item.type ? String(item.type).toLowerCase() : null;
          const targetId = item.id || item._id;

          state.skillListings = state.skillListings.filter((s) => {
            if (!s) return false;
            // Match by unique item id if available
            if (targetId && (s.id === targetId || s._id === targetId)) return false;

            // Match by userId and skill name (and type if present)
            if (targetUserId && targetSkill) {
              const sUserId = s.userId ? String(s.userId) : null;
              const sSkill = getCleanStr(s.skill);
              const sType = s.type ? String(s.type).toLowerCase() : null;

              if (sUserId === targetUserId && sSkill === targetSkill) {
                if (!targetType || !sType || targetType === sType) {
                  return false;
                }
              }
            }
            return true;
          });
        }
      })
      // Restore Skill
      .addCase(restoreSkillAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          state.skillListings = state.skillListings.map((s) =>
            (s.id === updated.id || s._id === updated._id ? updated : s)
          );
        }
      })
      // Fetch Admin Exchanges
      .addCase(fetchAdminExchangesAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAdminExchangesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.platformExchanges = action.payload || [];
      })
      .addCase(fetchAdminExchangesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Admin Sessions
      .addCase(fetchAdminSessionsAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAdminSessionsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.platformSessions = action.payload || [];
      })
      .addCase(fetchAdminSessionsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Activities
      .addCase(fetchAdminActivitiesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminActivitiesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.activities = action.payload || [];
      })
      .addCase(fetchAdminActivitiesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Reports
      .addCase(fetchAdminReportsAsync.fulfilled, (state, action) => {
        state.reports = action.payload || [];
      })
      // Review Report
      .addCase(reviewReportAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          state.reports = state.reports.map((r) => (r.id === updated.id || r._id === updated._id ? updated : r));
        }
      })
      // Resolve Report
      .addCase(resolveReportAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          state.reports = state.reports.map((r) => (r.id === updated.id || r._id === updated._id ? updated : r));
        }
      })
      // Delete Report
      .addCase(deleteAdminReportAsync.fulfilled, (state, action) => {
        const id = action.payload;
        state.reports = state.reports.filter((r) => r.id !== id && r._id !== id);
      })
      // Delete Admin Exchange
      .addCase(deleteAdminExchangeAsync.fulfilled, (state, action) => {
        const deletedId = action.payload?.id || action.payload;
        state.platformExchanges = (state.platformExchanges || []).filter(
          (ex) => ex.id !== deletedId && ex._id !== deletedId
        );
        if (state.stats && typeof state.stats.totalExchanges === "number") {
          state.stats.totalExchanges = Math.max(0, state.stats.totalExchanges - 1);
        }
      })
      // Add Skill Listing
      .addCase(addSkillListingAsync.fulfilled, (state, action) => {
        state.skillListings.unshift(action.payload);
      });
  },
});

export const { approveSkill, removeSkill, reviewReport, resolveReport, removeReport, addSkillListing } = adminSlice.actions;
export default adminSlice.reducer;
