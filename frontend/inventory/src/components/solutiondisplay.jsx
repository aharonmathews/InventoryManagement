// frontend/src/components/SolutionDisplay.jsx
import React from "react";
import ReactMarkdown from "react-markdown";

const SolutionDisplay = ({
  optimizationResults,
  problemType,
  aiExplanation,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="solution-panel">
        <p>🤖 AI is analyzing your problem and preparing solutions...</p>
        {/* You can add a loading spinner here */}
      </div>
    );
  }

  if (!optimizationResults && !aiExplanation) {
    return (
      <div className="solution-panel">
        <p>
          🎯 <strong>Ready for Optimization</strong>
        </p>
        <p>
          Complete the setup questions and upload your data to see optimization
          results here.
        </p>
      </div>
    );
  }

  return (
    <div className="solution-panel">
      {optimizationResults && (
        <>
          <h3>🎯 Optimization Successfully Completed!</h3>
          {problemType && (
            <p className="info-message">
              <strong>Identified Problem Type:</strong> {problemType}
            </p>
          )}

          <details>
            <summary>🔍 Technical Results (Raw Data)</summary>
            <pre>{JSON.stringify(optimizationResults, null, 2)}</pre>
          </details>

          {/* You could add a 'Generated Code' section here if the backend sends it back */}
        </>
      )}

      {aiExplanation && (
        <>
          <h3>🎯 Business Impact Analysis</h3>
          <ReactMarkdown>{aiExplanation}</ReactMarkdown>
        </>
      )}
    </div>
  );
};

export default SolutionDisplay;
