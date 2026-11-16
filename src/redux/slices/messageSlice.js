import { createSlice } from "@reduxjs/toolkit";
import { conversations as dummyConversations } from "../../data/dummyData.js";

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

const getConversationsForUser = (userId) => {
  if (!userId || userId === "1") {
    const existing = loadStorage("skillbridge_conversations_1", null) || loadStorage("skillbridge_conversations", null);
    if (existing && Array.isArray(existing)) return existing;
    saveStorage("skillbridge_conversations_1", dummyConversations);
    saveStorage("skillbridge_conversations", dummyConversations);
    return dummyConversations;
  }
  return loadStorage(`skillbridge_conversations_${userId}`, []);
};

const saveUserConversations = (conversations) => {
  const uid = getUserId();
  saveStorage(`skillbridge_conversations_${uid}`, conversations);
  if (uid === "1") {
    saveStorage("skillbridge_conversations", conversations);
  }
};

const initialConversations = (() => {
  const uid = getUserId();
  return getConversationsForUser(uid);
})();

const messageSlice = createSlice({
  name: "messages",
  initialState: { conversations: initialConversations },
  reducers: {
    sendMessage(state, action) {
      const { conversationId, text, from = "me" } = action.payload;
      const convo = state.conversations.find((c) => c.id === conversationId);
      if (convo) {
        convo.messages.push({
          from,
          text,
          time: "Now",
        });
        convo.time = "Now";
        saveUserConversations(state.conversations);
      }
    },
    startConversation(state, action) {
      const { partnerId, partnerName, partnerPhoto, initialMessage } = action.payload;
      let convo = state.conversations.find((c) => c.userId === partnerId || c.name === partnerName);
      if (!convo) {
        convo = {
          id: Date.now(),
          userId: partnerId,
          name: partnerName,
          photo: partnerPhoto || "https://randomuser.me/api/portraits/men/32.jpg",
          time: "Just now",
          messages: initialMessage
            ? [{ from: "me", text: initialMessage, time: "Just now" }]
            : [{ from: "them", text: `Hi! Thanks for connecting. What skill would you like to explore first?`, time: "Just now" }],
        };
        state.conversations.unshift(convo);
      }
      saveUserConversations(state.conversations);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload || { id: 1 };
        const uid = String(user.id);
        state.conversations = getConversationsForUser(uid);
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        const uid = user ? String(user.id) : Date.now().toString();
        state.conversations = [];
        saveStorage(`skillbridge_conversations_${uid}`, []);
      })
      .addCase("user/logoutUser", (state) => {
        state.conversations = dummyConversations;
      });
  },
});

export const { sendMessage, startConversation } = messageSlice.actions;
export default messageSlice.reducer;
