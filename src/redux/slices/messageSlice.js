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
export const fetchConversationsAsync = createAsyncThunk(
  "messages/fetchConversationsAsync",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/messages/conversations");
      return res.data.conversations || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch conversations");
    }
  }
);

export const fetchConversationByIdAsync = createAsyncThunk(
  "messages/fetchConversationByIdAsync",
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.get(`/messages/conversations/${id}`);
      return res.data.conversation;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch conversation");
    }
  }
);

export const startConversationAsync = createAsyncThunk(
  "messages/startConversationAsync",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await API.post("/messages/conversations", payload);
      return res.data.conversation;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to start conversation");
    }
  }
);

export const sendMessageAsync = createAsyncThunk(
  "messages/sendMessageAsync",
  async ({ conversationId, text }, { rejectWithValue }) => {
    try {
      const res = await API.post(`/messages/conversations/${conversationId}/messages`, { text });
      return res.data.conversation;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to send message");
    }
  }
);

export const markConversationReadAsync = createAsyncThunk(
  "messages/markConversationReadAsync",
  async (conversationId, { rejectWithValue }) => {
    try {
      await API.put(`/messages/conversations/${conversationId}/read`);
      return conversationId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark as read");
    }
  }
);

export const fetchUnreadCountAsync = createAsyncThunk(
  "messages/fetchUnreadCountAsync",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/messages/unread-count");
      return res.data.unreadCount || 0;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 0);
    }
  }
);

const initialConversations = (() => {
  const uid = getUserId();
  return getConversationsForUser(uid);
})();

const messageSlice = createSlice({
  name: "messages",
  initialState: {
    conversations: initialConversations,
    activeConversationId: null,
    totalUnread: 0,
    loading: false,
    error: null,
  },
  reducers: {
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
    },
    sendMessage(state, action) {
      const { conversationId, text, from = "me" } = action.payload;
      const cid = String(conversationId);
      const convo = state.conversations.find((c) => String(c.id || c._id) === cid);
      if (convo) {
        if (!convo.messages) convo.messages = [];
        const newMsgId = `temp_${Date.now()}`;
        convo.messages.push({
          id: newMsgId,
          _id: newMsgId,
          from,
          text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: false,
          createdAt: new Date().toISOString()
        });
        convo.time = "Just now";
        convo.lastMessage = text;
        saveUserConversations(state.conversations);
      }
    },
    startConversation(state, action) {
      const { partnerId, partnerName, partnerPhoto, initialMessage, exchangeId } = action.payload;
      const pidStr = partnerId ? String(partnerId) : "";
      let convo = state.conversations.find(
        (c) => (pidStr && String(c.userId || c.partnerId) === pidStr) || c.name === partnerName
      );
      if (!convo) {
        convo = {
          id: `local_${Date.now()}`,
          _id: `local_${Date.now()}`,
          userId: partnerId,
          partnerId,
          name: partnerName,
          partnerName,
          photo: partnerPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
          partnerPhoto: partnerPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
          time: "Just now",
          exchangeId: exchangeId || null,
          unreadCount: 0,
          messages: initialMessage
            ? [{ from: "me", text: initialMessage, time: "Just now", read: false }]
            : [],
        };
        state.conversations.unshift(convo);
      }
      saveUserConversations(state.conversations);
    },
    markReadLocal(state, action) {
      const cid = String(action.payload);
      const convo = state.conversations.find((c) => String(c.id || c._id) === cid);
      if (convo) {
        convo.unreadCount = 0;
        if (Array.isArray(convo.messages)) {
          convo.messages.forEach((m) => {
            if (m.from !== "me") m.read = true;
          });
        }
        saveUserConversations(state.conversations);
      }
    },
    clearMessageState(state) {
      state.conversations = [];
      state.activeConversationId = null;
      state.totalUnread = 0;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations Async
      .addCase(fetchConversationsAsync.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchConversationsAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.conversations = action.payload;
          state.totalUnread = action.payload.reduce(
            (acc, c) => acc + (c.unreadCount || 0),
            0
          );
          saveUserConversations(action.payload);
        }
      })
      .addCase(fetchConversationsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Single Conversation Async
      .addCase(fetchConversationByIdAsync.fulfilled, (state, action) => {
        const convo = action.payload;
        if (convo) {
          const cid = String(convo.id || convo._id);
          const idx = state.conversations.findIndex((c) => String(c.id || c._id) === cid);
          if (idx !== -1) {
            state.conversations[idx] = convo;
          } else {
            state.conversations.unshift(convo);
          }
          saveUserConversations(state.conversations);
        }
      })
      // Start Conversation Async
      .addCase(startConversationAsync.fulfilled, (state, action) => {
        const convo = action.payload;
        if (convo) {
          const cid = String(convo.id || convo._id);
          const exists = state.conversations.find((c) => String(c.id || c._id) === cid);
          if (!exists) {
            state.conversations.unshift(convo);
          } else {
            state.conversations = state.conversations.map((c) =>
              String(c.id || c._id) === cid ? convo : c
            );
          }
          state.activeConversationId = cid;
          saveUserConversations(state.conversations);
        }
      })
      // Send Message Async
      .addCase(sendMessageAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          const cid = String(updated.id || updated._id);
          state.conversations = state.conversations.map((c) =>
            String(c.id || c._id) === cid ? updated : c
          );
          saveUserConversations(state.conversations);
        }
      })
      // Mark Conversation Read Async
      .addCase(markConversationReadAsync.fulfilled, (state, action) => {
        const cid = String(action.payload);
        state.conversations = state.conversations.map((c) => {
          if (String(c.id || c._id) === cid) {
            return {
              ...c,
              unreadCount: 0,
              messages: (c.messages || []).map((m) =>
                m.from !== "me" ? { ...m, read: true } : m
              ),
            };
          }
          return c;
        });
        state.totalUnread = state.conversations.reduce(
          (acc, c) => acc + (c.unreadCount || 0),
          0
        );
        saveUserConversations(state.conversations);
      })
      // Total Unread Count Async
      .addCase(fetchUnreadCountAsync.fulfilled, (state, action) => {
        state.totalUnread = action.payload;
      })
      // Auth lifecycle handlers
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
      .addCase("user/logoutUser", (state) => {
        state.conversations = [];
        state.activeConversationId = null;
        state.totalUnread = 0;
      })
      .addCase("user/logoutUserAsync/fulfilled", (state) => {
        state.conversations = [];
        state.activeConversationId = null;
        state.totalUnread = 0;
      });
  },
});

export const {
  setActiveConversation,
  sendMessage,
  startConversation,
  markReadLocal,
  clearMessageState
} = messageSlice.actions;

export default messageSlice.reducer;
