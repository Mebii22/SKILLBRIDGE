import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/client.js";
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
  return u ? String(u.id || u._id) : null;
};

const getConversationsForUser = (userId) => {
  if (!userId) return [];
  const existing = loadStorage(`skillbridge_conversations_${userId}`, null);
  if (existing && Array.isArray(existing)) return existing;
  return [];
};

const saveUserConversations = (conversations) => {
  const uid = getUserId();
  if (uid) {
    saveStorage(`skillbridge_conversations_${uid}`, conversations);
  }
};

// ASYNC THUNKS
export const fetchConversationsAsync = createAsyncThunk("messages/fetchConversationsAsync", async (_, { rejectWithValue }) => {
  try {
    const res = await API.get("/messages/conversations");
    return res.data.conversations;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch conversations");
  }
});

export const startConversationAsync = createAsyncThunk("messages/startConversationAsync", async (payload, { rejectWithValue }) => {
  try {
    const res = await API.post("/messages/conversations", payload);
    return res.data.conversation;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to start conversation");
  }
});

export const sendMessageAsync = createAsyncThunk("messages/sendMessageAsync", async ({ conversationId, text }, { rejectWithValue }) => {
  try {
    const res = await API.post(`/messages/conversations/${conversationId}/messages`, { text });
    return res.data.conversation;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to send message");
  }
});

export const markConversationReadAsync = createAsyncThunk("messages/markConversationReadAsync", async (conversationId, { rejectWithValue }) => {
  try {
    await API.put(`/messages/conversations/${conversationId}/read`);
    return conversationId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to mark as read");
  }
});

const initialConversations = (() => {
  const uid = getUserId();
  return getConversationsForUser(uid);
})();

const messageSlice = createSlice({
  name: "messages",
  initialState: {
    conversations: initialConversations,
    loading: false,
    error: null,
  },
  reducers: {
    sendMessage(state, action) {
      const { conversationId, text, from = "me" } = action.payload;
      const convo = state.conversations.find((c) => c.id === conversationId || c._id === conversationId);
      if (convo) {
        if (!convo.messages) convo.messages = [];
        convo.messages.push({
          from,
          text,
          time: "Now",
        });
        convo.time = "Now";
        convo.lastMessage = text;
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
            : [],
        };
        state.conversations.unshift(convo);
      }
      saveUserConversations(state.conversations);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations Async
      .addCase(fetchConversationsAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversationsAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.conversations = action.payload;
          saveUserConversations(action.payload);
        }
      })
      .addCase(fetchConversationsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Start Conversation Async
      .addCase(startConversationAsync.fulfilled, (state, action) => {
        const convo = action.payload;
        const exists = state.conversations.find((c) => c.id === convo.id || c._id === convo._id);
        if (!exists) {
          state.conversations.unshift(convo);
        } else {
          state.conversations = state.conversations.map((c) => (c.id === convo.id || c._id === convo._id ? convo : c));
        }
        saveUserConversations(state.conversations);
      })
      // Send Message Async
      .addCase(sendMessageAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        state.conversations = state.conversations.map((c) => (c.id === updated.id || c._id === updated._id ? updated : c));
        saveUserConversations(state.conversations);
      })
      // Legacy user actions
      .addCase("user/loginUser", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.conversations = getConversationsForUser(uid);
        } else {
          state.conversations = [];
        }
      })
      .addCase("user/loginUserAsync/fulfilled", (state, action) => {
        const user = action.payload;
        if (user) {
          const uid = String(user.id || user._id);
          state.conversations = getConversationsForUser(uid);
        } else {
          state.conversations = [];
        }
      })
      .addCase("user/registerUser", (state, action) => {
        const { user } = action.payload || {};
        if (user) {
          const uid = String(user.id || user._id);
          state.conversations = [];
          saveStorage(`skillbridge_conversations_${uid}`, []);
        }
      })
      .addCase("user/registerUserAsync/fulfilled", (state) => {
        state.conversations = [];
      })
      .addCase("user/logoutUser", (state) => {
        state.conversations = [];
      });
  },
});

export const { sendMessage, startConversation } = messageSlice.actions;
export default messageSlice.reducer;
