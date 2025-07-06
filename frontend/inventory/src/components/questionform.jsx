// frontend/src/components/QuestionForm.jsx
import React, { useState, useEffect } from "react";

const QuestionForm = ({
  question,
  onSubmit,
  currentQuestionIndex,
  totalQuestions,
  onBack,
  canGoBack,
}) => {
  const [answer, setAnswer] = useState(() => {
    // Initialize state from local storage or previous session if available
    const stored = localStorage.getItem(`answer_${question.key}`);
    if (question.type === "multiselect") {
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
      return [];
    }
    return stored || "";
  });

  useEffect(() => {
    // Update answer when question changes
    const stored = localStorage.getItem(`answer_${question.key}`);
    if (question.type === "multiselect") {
      if (stored) {
        try {
          setAnswer(JSON.parse(stored));
        } catch {
          setAnswer([]);
        }
      } else {
        setAnswer([]);
      }
    } else {
      setAnswer(stored || "");
    }
  }, [question]);

  const handleChange = (e) => {
    if (question.type === "multiselect") {
      const value = Array.from(
        e.target.selectedOptions,
        (option) => option.value
      );
      setAnswer(value);
      localStorage.setItem(`answer_${question.key}`, JSON.stringify(value));
    } else {
      setAnswer(e.target.value);
      localStorage.setItem(`answer_${question.key}`, e.target.value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(answer);
    localStorage.removeItem(`answer_${question.key}`); // Clear after submit
  };

  return (
    <form onSubmit={handleSubmit} className="question-form">
      <h3>
        Question {currentQuestionIndex + 1}/{totalQuestions}
      </h3>
      <p>{question.question}</p>
      {question.type === "selectbox" && (
        <select value={Array.isArray(answer) ? "" : answer} onChange={handleChange}>
          <option value="">Select an option</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {question.type === "multiselect" && (
        <select multiple={true} value={Array.isArray(answer) ? answer : []} onChange={handleChange}>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {question.type === "text_input" && (
        <input
          type="text"
          value={Array.isArray(answer) ? "" : answer}
          onChange={handleChange}
          placeholder="Your answer"
        />
      )}
      {question.type === "textarea" && (
        <textarea
          value={Array.isArray(answer) ? "" : answer}
          onChange={handleChange}
          placeholder="Please provide details"
          rows="4"
        ></textarea>
      )}
      <div className="button-group">
        {canGoBack && (
          <button type="button" onClick={onBack}>
            ⬅️ Back
          </button>
        )}
        <button type="submit">Next ➡️</button>
      </div>
      <progress value={(currentQuestionIndex + 1) / totalQuestions}></progress>
    </form>
  );
};

export default QuestionForm;
