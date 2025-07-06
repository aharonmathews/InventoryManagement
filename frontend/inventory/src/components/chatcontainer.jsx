// frontend/src/components/ChatContainer.jsx
import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown"; // npm install react-markdown

const ChatContainer = ({ chatHistory }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  return (
    <div className="chat-container">
      {chatHistory.map((msg, index) => (
        <div
          key={index}
          className={msg.role === "bot" ? "bot-message" : "user-message"}
        >
          {msg.role === "bot" ? "🤖 Assistant:" : "👤 You:"}
          <br />
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatContainer;
