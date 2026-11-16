import { createSlice } from "@reduxjs/toolkit";
import {
  skillListings as dummySkillListings,
  reports as dummyReports,
  activities as dummyActivities,
} from "../../data/dummyData.js";

const isBrowser = typeof localStorage !== "undefined";

const loadStorage = (key, fallback) => {
  try {
    if (!isBrowser) return fallback;
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const saveStorage = (key, val) => {
  try {
    if (isBrowser) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch (e) {
    console.error(e);
  }
};

const initialSkillListings = (() => {
  const existing = loadStorage("skillbridge_skill_listings", null);
  if (existing && Array.isArray(existing)) return existing;
  saveStorage("skillbridge_skill_listings", dummySkillListings);
  return dummySkillListings;
})();

const initialReports = (() => {
  const existing = loadStorage("skillbridge_reports", null);
  if (existing && Array.isArray(existing)) return existing;
  saveStorage("skillbridge_reports", dummyReports);
  return dummyReports;
})();

const initialActivities = (() => {
  const existing = loadStorage("skillbridge_activities", null);
  if (existing && Array.isArray(existing)) return existing;
  saveStorage("skillbridge_activities", dummyActivities);
  return dummyActivities;
})();

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    skillListings: initialSkillListings,
    reports: initialReports,
    activities: initialActivities,
  },
  reducers: {
    approveSkill(state, action) {
      const listing = state.skillListings.find((l) => l.id === action.payload);
      if (listing) {
        listing.status = "approved";
        state.activities.unshift({
          text: `Skill listing '${listing.skill}' was approved by admin`,
          time: "Just now",
        });
        saveStorage("skillbridge_skill_listings", state.skillListings);
        saveStorage("skillbridge_activities", state.activities);
      }
    },
    removeSkill(state, action) {
      const listing = state.skillListings.find((l) => l.id === action.payload);
      state.skillListings = state.skillListings.filter((l) => l.id !== action.payload);
      if (listing) {
        state.activities.unshift({
          text: `Skill listing '${listing.skill}' was removed by admin`,
          time: "Just now",
        });
      }
      saveStorage("skillbridge_skill_listings", state.skillListings);
      saveStorage("skillbridge_activities", state.activities);
    },
    reviewReport(state, action) {
      const report = state.reports.find((r) => r.id === action.payload);
      if (report) {
        report.status = "reviewed";
        saveStorage("skillbridge_reports", state.reports);
      }
    },
    resolveReport(state, action) {
      const report = state.reports.find((r) => r.id === action.payload);
      if (report) {
        report.status = "resolved";
        state.activities.unshift({
          text: `Report #${report.id} on '${report.target}' was resolved by admin`,
          time: "Just now",
        });
        saveStorage("skillbridge_reports", state.reports);
        saveStorage("skillbridge_activities", state.activities);
      }
    },
    removeReport(state, action) {
      state.reports = state.reports.filter((r) => r.id !== action.payload);
      saveStorage("skillbridge_reports", state.reports);
    },
    addSkillListing(state, action) {
      state.skillListings.unshift({
        id: Date.now(),
        status: "approved",
        ...action.payload,
      });
      state.activities.unshift({
        text: `New skill listing '${action.payload.skill}' published by ${action.payload.user}`,
        time: "Just now",
      });
      saveStorage("skillbridge_skill_listings", state.skillListings);
      saveStorage("skillbridge_activities", state.activities);
    },
  },
});

export const { approveSkill, removeSkill, reviewReport, resolveReport, removeReport, addSkillListing } = adminSlice.actions;
export default adminSlice.reducer;
