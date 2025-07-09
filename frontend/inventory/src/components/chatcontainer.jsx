// frontend/src/components/ChatContainer.jsx
import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const ChatContainer = ({ chatHistory, isLoading }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  return (
    <div className="chat-container">
      {chatHistory.length === 0 && (
        <div className="welcome-message">
          <h4>👋 Welcome to AI Business Optimizer!</h4>
          <p>
            I'll help you analyze your business problem and create custom
            optimization solutions. Let's start by understanding your needs.
          </p>
        </div>
      )}

      {chatHistory.map((msg, index) => (
        <div
          key={index}
          className={`message ${
            msg.role === "bot" ? "bot-message" : "user-message"
          }`}
        >
          <div className="message-header">
            <span className="message-author">
              {msg.role === "bot" ? "🤖 AI Assistant" : "👤 You"}
            </span>
            <span className="message-time">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="message-content">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="message bot-message typing-indicator">
          <div className="message-header">
            <span className="message-author">🤖 AI Assistant</span>
            <span className="message-time">typing...</span>
          </div>
          <div className="message-content">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatContainer;
