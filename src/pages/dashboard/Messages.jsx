import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiSend, FiArrowLeft } from "react-icons/fi";
import { sendMessage, startConversation } from "../../redux/slices/messageSlice";
import { addNotification } from "../../redux/slices/notificationSlice";
import EmptyState from "../../components/EmptyState";

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const convos = useSelector((s) => s.messages.conversations);

  const [activeId, setActiveId] = useState(convos[0]?.id || 1);
  const [text, setText] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(location.state?.partnerName));

  // Handle incoming partner from other pages
  useEffect(() => {
    if (location.state && location.state.partnerName) {
      const { partnerId, partnerName, partnerPhoto } = location.state;
      let existing = convos.find((c) => c.userId === partnerId || c.name === partnerName);
      if (!existing) {
        dispatch(startConversation({ partnerId, partnerName, partnerPhoto }));
      }
      setMobileShowChat(true);
    }
  }, [location.state, convos, dispatch]);

  useEffect(() => {
    if (location.state && location.state.partnerName) {
      const match = convos.find((c) => c.userId === location.state.partnerId || c.name === location.state.partnerName);
      if (match) {
        setActiveId(match.id);
        setMobileShowChat(true);
      }
    }
  }, [convos, location.state]);

  const active = convos.find((c) => c.id === activeId) || convos[0];

  const send = () => {
    if (!text.trim() || !active) return;
    const msgText = text.trim();
    dispatch(sendMessage({ conversationId: active.id, text: msgText, from: "me" }));
    setText("");

    // Simulate interactive auto-reply
    const currentActiveId = active.id;
    const partnerName = active.name;
    setTimeout(() => {
      dispatch(sendMessage({ conversationId: currentActiveId, text: "Sounds good! Talk soon.", from: "them" }));
      dispatch(addNotification({
        type: "message",
        title: "New message",
        text: `${partnerName} replied to your message.`,
      }));
    }, 1200);
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
              key={c.id}
              className={`conv ${c.id === (active?.id) ? "active" : ""}`}
              onClick={() => {
                setActiveId(c.id);
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
