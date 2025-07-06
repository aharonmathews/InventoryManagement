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
    return (
      localStorage.getItem(`answer_${question.key}`) ||
      (question.type === "multiselect" ? [] : "")
    );
  });

  useEffect(() => {
    // Update answer when question changes
    setAnswer(
      localStorage.getItem(`answer_${question.key}`) ||
        (question.type === "multiselect" ? [] : "")
    );
  }, [question]);

  const handleChange = (e) => {
    if (question.type === "multiselect") {
      const value = Array.from(
        e.target.selectedOptions,
        (option) => option.value
      );
      setAnswer(value);
    } else {
      setAnswer(e.target.value);
    }
    localStorage.setItem(
      `answer_${question.key}`,
      Array.isArray(e.target.value)
        ? JSON.stringify(e.target.value)
        : e.target.value
    );
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
        <select value={answer} onChange={handleChange}>
          <option value="">Select an option</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {question.type === "multiselect" && (
        <select multiple={true} value={answer} onChange={handleChange}>
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
          value={answer}
          onChange={handleChange}
          placeholder="Your answer"
        />
      )}
      {question.type === "textarea" && (
        <textarea
          value={answer}
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
