import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice.js";
import savedReducer from "./slices/savedSlice.js";
import exchangeReducer from "./slices/exchangeSlice.js";
import notificationReducer from "./slices/notificationSlice.js";
import sessionReducer from "./slices/sessionSlice.js";
import messageReducer from "./slices/messageSlice.js";
import adminReducer from "./slices/adminSlice.js";
import skillReducer from "./slices/skillSlice.js";

export const store = configureStore({
  reducer: {
    user: userReducer,
    saved: savedReducer,
    exchanges: exchangeReducer,
    notifications: notificationReducer,
    sessions: sessionReducer,
    messages: messageReducer,
    admin: adminReducer,
    skills: skillReducer,
  },
});
