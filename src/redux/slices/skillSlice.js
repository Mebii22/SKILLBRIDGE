import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/client";

// Fetch public approved skill listings
export const fetchPublicSkillsAsync = createAsyncThunk(
  "skills/fetchPublicSkillsAsync",
  async (queryParams, { rejectWithValue }) => {
    try {
      const res = await API.get("/skills", { params: queryParams });
      return res.data.skills || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch skills");
    }
  }
);

// Fetch authenticated user's own skill listings
export const fetchMySkillsAsync = createAsyncThunk(
  "skills/fetchMySkillsAsync",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/skills/my");
      return res.data.skills || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch your skill listings");
    }
  }
);

// Create a new skill listing
export const createSkillListingAsync = createAsyncThunk(
  "skills/createSkillListingAsync",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await API.post("/skills", payload);
      return res.data.skill;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to publish skill listing");
    }
  }
);

// Update an existing skill listing
export const updateSkillListingAsync = createAsyncThunk(
  "skills/updateSkillListingAsync",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/skills/${id}`, data);
      return res.data.skill;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update skill listing");
    }
  }
);

// Delete an existing skill listing
export const deleteSkillListingAsync = createAsyncThunk(
  "skills/deleteSkillListingAsync",
  async (id, { rejectWithValue }) => {
    try {
      await API.delete(`/skills/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete skill listing");
    }
  }
);

const skillSlice = createSlice({
  name: "skills",
  initialState: {
    myListings: [],
    publicListings: [],
    loading: false,
    publicLoading: false,
    submitting: false,
    error: null,
  },
  reducers: {
    clearSkillError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Public Skills
      .addCase(fetchPublicSkillsAsync.pending, (state) => {
        state.publicLoading = true;
      })
      .addCase(fetchPublicSkillsAsync.fulfilled, (state, action) => {
        state.publicLoading = false;
        state.publicListings = action.payload;
      })
      .addCase(fetchPublicSkillsAsync.rejected, (state) => {
        state.publicLoading = false;
      })
      // Fetch My Skills
      .addCase(fetchMySkillsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMySkillsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.myListings = action.payload;
      })
      .addCase(fetchMySkillsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Skill Listing
      .addCase(createSkillListingAsync.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createSkillListingAsync.fulfilled, (state, action) => {
        state.submitting = false;
        state.myListings.unshift(action.payload);
      })
      .addCase(createSkillListingAsync.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // Update Skill Listing
      .addCase(updateSkillListingAsync.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateSkillListingAsync.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.myListings.findIndex(
          (s) => s.id === action.payload.id || s._id === action.payload._id
        );
        if (index !== -1) {
          state.myListings[index] = action.payload;
        }
      })
      .addCase(updateSkillListingAsync.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // Delete Skill Listing
      .addCase(deleteSkillListingAsync.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteSkillListingAsync.fulfilled, (state, action) => {
        state.submitting = false;
        state.myListings = state.myListings.filter(
          (s) => s.id !== action.payload && s._id !== action.payload
        );
      })
      .addCase(deleteSkillListingAsync.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // Account switching & logout cleanup: purge account-specific listings
      .addCase("user/logoutUser", (state) => {
        state.myListings = [];
        state.loading = false;
        state.submitting = false;
        state.error = null;
      })
      .addCase("user/logoutUserAsync/fulfilled", (state) => {
        state.myListings = [];
        state.loading = false;
        state.submitting = false;
        state.error = null;
      });
  },
});

export const { clearSkillError, clearMySkills } = skillSlice.actions;
export default skillSlice.reducer;
