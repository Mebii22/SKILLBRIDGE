import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiSend, FiArrowLeft } from "react-icons/fi";
import {
  sendMessage,
  startConversation,
  fetchConversationsAsync,
  startConversationAsync,
  sendMessageAsync,
  markConversationReadAsync,
} from "../../redux/slices/messageSlice";
import { addNotification } from "../../redux/slices/notificationSlice";
import EmptyState from "../../components/EmptyState";

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const convos = useSelector((s) => s.messages.conversations);

  const [activeId, setActiveId] = useState(convos[0]?._id || convos[0]?.id || 1);
  const [text, setText] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(location.state?.partnerName));

  useEffect(() => {
    dispatch(fetchConversationsAsync());
    const pollTimer = setInterval(() => {
      dispatch(fetchConversationsAsync());
    }, 6000);
    return () => clearInterval(pollTimer);
  }, [dispatch]);

  // Handle incoming partner from other pages
  useEffect(() => {
    if (location.state && location.state.partnerName) {
      const { partnerId, partnerName, partnerPhoto } = location.state;
      let existing = convos.find((c) => String(c.userId) === String(partnerId) || c.name === partnerName);
      if (!existing) {
        dispatch(startConversation({ partnerId, partnerName, partnerPhoto }));
        if (partnerId) dispatch(startConversationAsync({ partnerId }));
      }
      setMobileShowChat(true);
    }
  }, [location.state, convos, dispatch]);

  useEffect(() => {
    if (location.state && location.state.partnerName) {
      const match = convos.find((c) => String(c.userId) === String(location.state.partnerId) || c.name === location.state.partnerName);
      if (match) {
        setActiveId(match._id || match.id);
        setMobileShowChat(true);
      }
    }
  }, [convos, location.state]);

  const active = convos.find((c) => String(c._id || c.id) === String(activeId)) || convos[0];

  const send = () => {
    if (!text.trim() || !active) return;
    const msgText = text.trim();
    const currentActiveId = active._id || active.id;
    const partnerName = active.name;

    dispatch(sendMessage({ conversationId: currentActiveId, text: msgText, from: "me" }));
    dispatch(sendMessageAsync({
      conversationId: currentActiveId,
      recipientId: active.userId,
      text: msgText,
    }));
    setText("");
  };

  if (!convos || convos.length === 0) {
    return (
      <>
        <div className="page-head">
          <h1>Messages</h1>
          <p>Chat with your exchange partners.</p>
        </div>
        <EmptyState
          doodle="chat"
          title="No messages yet"
          text="When you connect with learning partners or send exchange requests, your direct messages will appear here."
          actionLabel="Discover Learning Partners"
          onAction={() => navigate("/discover")}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Messages</h1>
        <p>Chat with your exchange partners.</p>
      </div>

      <div className={`msg-layout ${mobileShowChat ? "show-chat-mobile" : "show-list-mobile"}`}>
        {/* conversation list */}
        <div className="conv-list">
          {convos.map((c) => (
            <button
              key={c._id || c.id}
              className={`conv ${String(c._id || c.id) === String(active?._id || active?.id) ? "active" : ""}`}
              onClick={() => {
                const idVal = c._id || c.id;
                setActiveId(idVal);
                dispatch(markConversationReadAsync(idVal));
                setMobileShowChat(true);
              }}
            >
              <img src={c.photo} alt={c.name} />
              <div className="c-body">
                <div className="c-name">{c.name}<span className="c-time">{c.time}</span></div>
                <div className="c-prev">{c.messages && c.messages[c.messages.length - 1]?.text}</div>
              </div>
            </button>
          ))}
        </div>

        {/* chat window */}
        {active ? (
          <div className="chat">
            <div className="chat-head">
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setMobileShowChat(false)}
                aria-label="Back to conversation list"
              >
                <FiArrowLeft /> Back
              </button>
              <img src={active.photo} alt={active.name} />
              <div>
                <div className="ch-name">{active.name}</div>
                <div className="ch-status"><i /> Online</div>
              </div>
            </div>
            <div className="chat-body">
              {(active.messages || []).map((m, i) => (
                <div key={i} className={`bubble ${m.from === "me" ? "me" : "them"}`}>
                  {m.text}
                  <span className="b-time">{m.time}</span>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                placeholder="Write a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="send-btn" onClick={send} aria-label="Send"><FiSend /></button>
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
