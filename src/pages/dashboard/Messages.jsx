import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiSend, FiArrowLeft, FiSearch, FiCheck, FiMessageSquare, FiX } from "react-icons/fi";
import {
  sendMessage,
  startConversation,
  markReadLocal,
  fetchConversationsAsync,
  startConversationAsync,
  sendMessageAsync,
  markConversationReadAsync,
} from "../../redux/slices/messageSlice";
import EmptyState from "../../components/EmptyState";

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const convos = useSelector((s) => s.messages.conversations || []);
  const loading = useSelector((s) => s.messages.loading);

  const [activeId, setActiveId] = useState(null);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(location.state?.partnerName || location.state?.partnerId));

  const messagesEndRef = useRef(null);

  // 1. Initial Fetch and Periodic Near-Real-Time Polling
  useEffect(() => {
    dispatch(fetchConversationsAsync());
    const pollInterval = setInterval(() => {
      dispatch(fetchConversationsAsync());
    }, 6000);

    return () => clearInterval(pollInterval);
  }, [dispatch]);

  // 2. Set active conversation default when convos load
  useEffect(() => {
    if (!activeId && convos.length > 0) {
      const firstId = convos[0]._id || convos[0].id;
      setActiveId(firstId);
      dispatch(markConversationReadAsync(firstId));
      dispatch(markReadLocal(firstId));
    }
  }, [convos, activeId, dispatch]);

  // 3. Handle incoming partner initiation from other pages (Discover, Exchanges, Profile)
  useEffect(() => {
    if (location.state && (location.state.partnerName || location.state.partnerId)) {
      const { partnerId, partnerName, partnerPhoto, exchangeId } = location.state;
      const pidStr = partnerId ? String(partnerId) : "";

      const existing = convos.find(
        (c) => (pidStr && String(c.userId || c.partnerId) === pidStr) || c.name === partnerName
      );

      if (existing) {
        const idVal = existing._id || existing.id;
        setActiveId(idVal);
        dispatch(markConversationReadAsync(idVal));
        dispatch(markReadLocal(idVal));
      } else if (partnerId || partnerName) {
        dispatch(startConversation({ partnerId, partnerName, partnerPhoto, exchangeId }));
        dispatch(startConversationAsync({ partnerId, partnerName, exchangeId })).then((res) => {
          if (res.payload && (res.payload._id || res.payload.id)) {
            setActiveId(res.payload._id || res.payload.id);
          }
        });
      }
      setMobileShowChat(true);
    }
  }, [location.state, convos, dispatch]);

  // 4. Mark conversation as read whenever active conversation changes
  useEffect(() => {
    if (activeId) {
      dispatch(markConversationReadAsync(activeId));
      dispatch(markReadLocal(activeId));
    }
  }, [activeId, dispatch]);

  // 5. Auto scroll to bottom of chat
  const active = convos.find((c) => String(c._id || c.id) === String(activeId)) || convos[0];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [active?.messages]);

  // 6. Filter conversations by search query
  const filteredConvos = (convos || []).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (c.name || c.partnerName || "").toLowerCase().includes(q);
    const msgMatch = (c.lastMessage || "").toLowerCase().includes(q);
    return nameMatch || msgMatch;
  });

  const send = async () => {
    if (!text.trim() || !active || sending) return;
    const msgText = text.trim();
    if (msgText.length > 2000) {
      alert("Message exceeds maximum allowed length of 2000 characters.");
      return;
    }

    const currentActiveId = active._id || active.id;
    setSending(true);

    // Optimistic local dispatch
    dispatch(sendMessage({ conversationId: currentActiveId, text: msgText, from: "me" }));
    setText("");

    try {
      await dispatch(
        sendMessageAsync({
          conversationId: currentActiveId,
          text: msgText,
        })
      ).unwrap();
    } catch (err) {
      console.error("Failed to send message:", err);
      alert(typeof err === "string" ? err : "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // 7. Full Empty State when user has no conversations
  if (!convos || convos.length === 0) {
    return (
      <>
        <div className="page-head">
          <h1>Direct Messages</h1>
          <p>Communicate in real time with your learning partners and exchange peers.</p>
        </div>
        <EmptyState
          doodle="chat"
          title="No messages yet"
          text="When you connect with learning partners or accept exchange proposals, your direct messages will appear here."
          actionLabel="Discover Learning Partners"
          onAction={() => navigate("/discover")}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Direct Messages</h1>
        <p>Communicate in real time with your learning partners and exchange peers.</p>
      </div>

      <div className={`msg-layout ${mobileShowChat ? "show-chat-mobile" : "show-list-mobile"}`}>
        {/* Conversation Sidebar */}
        <div className="conv-list">
          {/* Conversation Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#fff",
              border: "1.5px solid var(--border)",
              borderRadius: 12,
              padding: "8px 12px",
              marginBottom: 12,
              gap: 8,
            }}
          >
            <FiSearch style={{ color: "var(--gray)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                fontSize: 13,
                background: "transparent",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray)", padding: 0 }}
                aria-label="Clear search"
              >
                <FiX />
              </button>
            )}
          </div>

          {filteredConvos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--gray)", fontSize: 13 }}>
              No conversations found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredConvos.map((c) => {
              const cid = c._id || c.id;
              const isActive = String(cid) === String(active?._id || active?.id);
              const unread = c.unreadCount || 0;

              return (
                <button
                  key={cid}
                  type="button"
                  className={`conv ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveId(cid);
                    dispatch(markConversationReadAsync(cid));
                    dispatch(markReadLocal(cid));
                    setMobileShowChat(true);
                  }}
                  style={{
                    position: "relative",
                    background: isActive ? "var(--cream)" : "transparent",
                    borderColor: isActive ? "var(--ink)" : "transparent",
                  }}
                >
                  <img
                    src={c.photo || c.partnerPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                    alt={c.name || c.partnerName}
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
                    }}
                  />
                  <div className="c-body">
                    <div className="c-name">
                      <span>{c.name || c.partnerName}</span>
                      <span className="c-time">{c.time}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <div className="c-prev" style={{ fontWeight: unread > 0 ? 700 : 400, color: unread > 0 ? "var(--ink)" : "var(--gray)" }}>
                        {c.lastMessage || "No messages yet"}
                      </div>
                      {unread > 0 && (
                        <span
                          style={{
                            background: "#F7C843",
                            color: "#111",
                            fontSize: 11,
                            fontWeight: 800,
                            borderRadius: 12,
                            padding: "1px 7px",
                            minWidth: 18,
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Chat Window */}
        {active ? (
          <div className="chat">
            {/* Header */}
            <div className="chat-head" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  className="mobile-back-btn"
                  onClick={() => setMobileShowChat(false)}
                  aria-label="Back to conversation list"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: 12.5,
                  }}
                >
                  <FiArrowLeft /> Back
                </button>

                <img
                  src={active.photo || active.partnerPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                  alt={active.name || active.partnerName}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
                  }}
                />
                <div>
                  <div className="ch-name">{active.name || active.partnerName}</div>
                  <div className="ch-status">
                    <i /> Active Partner
                  </div>
                </div>
              </div>

              {active.userId && (
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => navigate(`/profile/${active.userId}`)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  View Profile
                </button>
              )}
            </div>

            {/* Message Body */}
            <div className="chat-body">
              {(!active.messages || active.messages.length === 0) ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    textAlign: "center",
                    color: "var(--gray)",
                    padding: "40px 20px",
                  }}
                >
                  <FiMessageSquare style={{ fontSize: 36, marginBottom: 10, color: "#F7C843" }} />
                  <h4 style={{ margin: "0 0 6px", color: "var(--ink)", fontSize: 16 }}>Start the Conversation</h4>
                  <p style={{ margin: 0, fontSize: 13.5, maxWidth: 360 }}>
                    Say hello to {active.name || active.partnerName}! Coordinate learning topics, agree on session dates, and share exchange goals.
                  </p>
                </div>
              ) : (
                active.messages.map((m, i) => (
                  <div
                    key={m.id || m._id || i}
                    className={`bubble ${m.from === "me" ? "me" : "them"}`}
                    style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                  >
                    <div>{m.text}</div>
                    <div
                      className="b-time"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: m.from === "me" ? "flex-end" : "flex-start",
                        gap: 4,
                      }}
                    >
                      <span>{m.time}</span>
                      {m.from === "me" && (
                        <span title={m.read ? "Read by partner" : "Delivered"}>
                          {m.read ? (
                            <span style={{ color: "#F7C843", fontWeight: 800 }}>✓✓</span>
                          ) : (
                            <span style={{ opacity: 0.7 }}>✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="chat-input">
              <input
                type="text"
                placeholder={`Message ${active.name || active.partnerName}… (Press Enter to send)`}
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                type="button"
                className="send-btn"
                onClick={send}
                disabled={!text.trim() || sending}
                aria-label="Send message"
                style={{
                  opacity: (!text.trim() || sending) ? 0.5 : 1,
                  cursor: (!text.trim() || sending) ? "not-allowed" : "pointer",
                }}
              >
                <FiSend />
              </button>
            </div>
          </div>
        ) : (
          <div className="chat" style={{ justifyContent: "center", alignItems: "center", color: "var(--gray)" }}>
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </>
  );
}
