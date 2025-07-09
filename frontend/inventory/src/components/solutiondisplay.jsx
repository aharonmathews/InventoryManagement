// frontend/src/components/SolutionDisplay.jsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

const SolutionDisplay = ({
  optimizationResults,
  problemType,
  aiExplanation,
  isLoading,
}) => {
  const [showRawData, setShowRawData] = useState(false);

  if (isLoading) {
    return (
      <div className="solution-panel loading-state">
        <div className="loading-header">
          <div className="loading-spinner"></div>
          <h3>🤖 AI is Working on Your Solution</h3>
        </div>
        <div className="loading-steps">
          <div className="loading-step">
            <span className="step-icon">🔍</span>
            <span>Analyzing your business problem...</span>
          </div>
          <div className="loading-step">
            <span className="step-icon">⚡</span>
            <span>Generating optimization model...</span>
          </div>
          <div className="loading-step">
            <span className="step-icon">📊</span>
            <span>Computing optimal solutions...</span>
          </div>
          <div className="loading-step">
            <span className="step-icon">📝</span>
            <span>Preparing business insights...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!optimizationResults && !aiExplanation) {
    return (
      <div className="solution-panel empty-state">
        <div className="empty-state-content">
          <div className="empty-state-icon">🎯</div>
          <h3>Ready for Optimization</h3>
          <p>
            Complete the setup questions and upload your data to see your custom
            optimization solution here.
          </p>
          <div className="features-preview">
            <h4>What you'll get:</h4>
            <ul>
              <li>✨ AI-powered problem analysis</li>
              <li>📊 Custom optimization model</li>
              <li>💡 Business impact insights</li>
              <li>🔧 Actionable recommendations</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="solution-panel">
      {optimizationResults && (
        <div className="results-section">
          <div className="success-header">
            <div className="success-icon">🎉</div>
            <h3>Optimization Successfully Completed!</h3>
          </div>

          {problemType && (
            <div className="problem-type-card">
              <h4>🔍 Identified Problem Type</h4>
              <div className="problem-type-badge">{problemType}</div>
            </div>
          )}

          <div className="results-actions">
            <button
              className={`results-toggle ${showRawData ? "active" : ""}`}
              onClick={() => setShowRawData(!showRawData)}
            >
              {showRawData ? "📊 Show Summary" : "🔍 Show Technical Details"}
            </button>
          </div>

          {showRawData && (
            <div className="raw-data-section">
              <h4>📋 Technical Results</h4>
              <pre className="results-data">
                {JSON.stringify(optimizationResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {aiExplanation && (
        <div className="explanation-section">
          <div className="explanation-header">
            <h3>🎯 Business Impact Analysis</h3>
            <div className="ai-badge">
              <span className="ai-icon">🤖</span>
              AI-Generated Insights
            </div>
          </div>

          <div className="explanation-content">
            <ReactMarkdown>{aiExplanation}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolutionDisplay;
