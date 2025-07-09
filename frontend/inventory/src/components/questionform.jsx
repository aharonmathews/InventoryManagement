// frontend/src/components/QuestionForm.jsx
import React, { useState, useEffect } from "react";

const QuestionForm = ({
  question,
  onSubmit,
  currentQuestionIndex,
  totalQuestions,
  onBack,
  canGoBack,
  isLoading,
}) => {
  const [answer, setAnswer] = useState(() => {
    // Initialize state from session storage (not localStorage due to Claude restrictions)
    if (question.type === "multiselect") {
      return [];
    }
    return "";
  });

  const [touched, setTouched] = useState(false);

  useEffect(() => {
    // Reset answer when question changes
    if (question.type === "multiselect") {
      setAnswer([]);
    } else {
      setAnswer("");
    }
    setTouched(false);
  }, [question]);

  const handleChange = (e) => {
    setTouched(true);
    if (question.type === "multiselect") {
      const value = Array.from(
        e.target.selectedOptions,
        (option) => option.value
      );
      setAnswer(value);
    } else {
      setAnswer(e.target.value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      setTouched(true);
      return;
    }
    onSubmit(answer);
  };

  const isValid =
    answer &&
    (Array.isArray(answer) ? answer.length > 0 : answer.trim() !== "");
  const showError = touched && !isValid && question.required;

  const progressPercentage =
    ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="question-form-container">
      <div className="question-progress">
        <div className="progress-text">
          <span>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="question-form">
        <div className="question-header">
          <h3>{question.question}</h3>
          {question.required && <span className="required-indicator">*</span>}
        </div>

        <div className="form-group">
          {question.type === "selectbox" && (
            <div className="select-wrapper">
              <select
                value={Array.isArray(answer) ? "" : answer}
                onChange={handleChange}
                className={showError ? "error" : ""}
              >
                <option value="">Choose an option...</option>
                {question.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          )}

          {question.type === "multiselect" && (
            <div className="multiselect-wrapper">
              <div className="multiselect-hint">
                💡 Hold Ctrl (or Cmd on Mac) to select multiple options
              </div>
              <select
                multiple={true}
                value={Array.isArray(answer) ? answer : []}
                onChange={handleChange}
                className={showError ? "error" : ""}
              >
                {question.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {Array.isArray(answer) && answer.length > 0 && (
                <div className="selected-items">
                  <strong>Selected:</strong> {answer.join(", ")}
                </div>
              )}
            </div>
          )}

          {question.type === "text_input" && (
            <input
              type="text"
              value={Array.isArray(answer) ? "" : answer}
              onChange={handleChange}
              placeholder="Enter your answer..."
              className={showError ? "error" : ""}
            />
          )}

          {question.type === "textarea" && (
            <textarea
              value={Array.isArray(answer) ? "" : answer}
              onChange={handleChange}
              placeholder="Please provide details..."
              rows="4"
              className={showError ? "error" : ""}
            />
          )}

          {showError && (
            <div className="error-message">
              This field is required. Please provide an answer.
            </div>
          )}
        </div>

        <div className="form-actions">
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="secondary-button"
              disabled={isLoading}
            >
              ⬅️ Previous
            </button>
          )}
          <button
            type="submit"
            className="primary-button"
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Processing...
              </>
            ) : (
              <>Next ➡️</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;
