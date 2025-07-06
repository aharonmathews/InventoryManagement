// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import "./App.css"; // Or your index.css
import ChatContainer from "./components/chatcontainer";
import QuestionForm from "./components/questionform";
import SolutionDisplay from "./components/solutiondisplay";

// Define initial questions directly in the frontend or fetch from backend if dynamic
const INITIAL_QUESTIONS = [
  {
    key: "business_type",
    question: "What type of business or problem are you trying to optimize?",
    type: "selectbox",
    options: [
      "Retail/Inventory Management",
      "Manufacturing/Production",
      "Logistics/Transportation",
      "Supply Chain",
      "Scheduling/Resource Allocation",
      "Financial Portfolio",
      "Other",
    ],
    required: true,
  },
  {
    key: "business_location",
    question:
      "Where is your business located? (This helps with regional considerations)",
    type: "text_input",
    required: true,
  },
  {
    key: "optimization_goal",
    question: "What is your primary optimization goal?",
    type: "selectbox",
    options: [
      "Minimize Cost",
      "Maximize Profit",
      "Maximize Efficiency",
      "Minimize Time",
      "Maximize Output",
      "Minimize Risk",
      "Balance Multiple Objectives",
    ],
    required: true,
  },
  {
    key: "constraints",
    question: "What are your main constraints? (Select all that apply)",
    type: "multiselect",
    options: [
      "Budget Limitations",
      "Storage/Space Constraints",
      "Time Constraints",
      "Resource Availability",
      "Regulatory Requirements",
      "Quality Standards",
      "Customer Demand",
      "Supplier Limitations",
    ],
    required: true,
  },
  {
    key: "budget_range",
    question: "What's your budget range for this optimization?",
    type: "selectbox",
    options: [
      "Under ₹1 Lakh",
      "₹1-10 Lakhs",
      "₹10-50 Lakhs",
      "₹50 Lakhs - 1 Crore",
      "Above ₹1 Crore",
      "No specific budget",
    ],
    required: true,
  },
  {
    key: "time_horizon",
    question: "What's your planning time horizon?",
    type: "selectbox",
    options: [
      "Daily",
      "Weekly",
      "Monthly",
      "Quarterly",
      "Yearly",
      "Long-term (5+ years)",
    ],
    required: true,
  },
  {
    key: "data_description",
    question:
      "Please describe the data you have or the specific problem details:",
    type: "textarea",
    required: true,
  },
];

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionsCompleted, setQuestionsCompleted] = useState(false);
  const [uploadedDataInfo, setUploadedDataInfo] = useState(null); // {preview, shape, columns}
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [problemType, setProblemType] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [followUpQuestion, setFollowUpQuestion] = useState("");

  const BACKEND_URL = "http://localhost:5000/api";

  // Initialize session when component mounts
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BACKEND_URL}/init_session`);
        const data = await response.json();
        if (data.session_id) {
          setSessionId(data.session_id);
          setChatHistory(data.chat_history);
        } else {
          setError("Failed to initialize session.");
        }
      } catch (err) {
        setError("Error connecting to backend.");
        console.error("Error initializing session:", err);
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  const handleAnswerSubmit = async (answer) => {
    setError(null);
    if (!answer && INITIAL_QUESTIONS[currentQuestionIndex].required) {
      setError("Please provide an answer before proceeding.");
      return;
    }

    const question = INITIAL_QUESTIONS[currentQuestionIndex];
    const newUserAnswers = { ...userAnswers, [question.key]: answer };
    setUserAnswers(newUserAnswers);

    // Add user message to chat history immediately for responsiveness
    setChatHistory((prev) => [
      ...prev,
      {
        role: "user",
        content: `**${question.question}**\n${
          Array.isArray(answer) ? answer.join(", ") : answer
        }`,
      },
    ]);

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/submit_answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId,
          question_key: question.key,
          user_answer: answer,
          current_question_index: currentQuestionIndex,
          total_questions: INITIAL_QUESTIONS.length,
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setChatHistory(data.chat_history); // Update chat history from backend
        if (data.questions_completed) {
          setQuestionsCompleted(true);
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Error submitting answer.");
      console.error("Error submitting answer:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    setError(null);
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/upload_data`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.status === "success") {
        setUploadedDataInfo({
          preview: data.data_preview,
          shape: data.data_shape,
          columns: data.data_columns,
        });
        setChatHistory(data.chat_history);
        // Trigger an AI analysis message from the bot here if desired
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Error uploading file.");
      console.error("Error uploading file:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOptimization = async () => {
    setError(null);
    setOptimizationResults(null); // Clear previous results
    setAiExplanation(null); // Clear previous explanation

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/start_optimization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setOptimizationResults(data.optimization_results);
        setProblemType(data.problem_type);
        setChatHistory(data.chat_history);
        // Now trigger AI explanation
        await fetchAIExplanation(data.optimization_results, data.problem_type);
      } else {
        setError(data.message);
        setChatHistory(data.chat_history);
      }
    } catch (err) {
      setError("Error starting optimization.");
      console.error("Error starting optimization:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIExplanation = async (results, type) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/get_ai_explanation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          results: results,
          problem_type: type,
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setAiExplanation(data.ai_explanation);
        setChatHistory(data.chat_history);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Error getting AI explanation.");
      console.error("Error getting AI explanation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpQuestion = async () => {
    setError(null);
    if (!followUpQuestion.trim()) return;

    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: followUpQuestion },
    ]);
    setFollowUpQuestion(""); // Clear input

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/followup_question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_question: followUpQuestion,
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setChatHistory(data.chat_history);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Error sending follow-up question.");
      console.error("Error sending follow-up question:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/reset_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      // Reset all local state
      setSessionId(null);
      setChatHistory([]);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setQuestionsCompleted(false);
      setUploadedDataInfo(null);
      setOptimizationResults(null);
      setProblemType(null);
      setAiExplanation(null);
      setFollowUpQuestion("");
      // Re-initialize session
      const response = await fetch(`${BACKEND_URL}/init_session`);
      const data = await response.json();
      if (data.session_id) {
        setSessionId(data.session_id);
        setChatHistory(data.chat_history);
      } else {
        setError("Failed to re-initialize session after reset.");
      }
    } catch (err) {
      setError("Error resetting session.");
      console.error("Error resetting session:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <h1>🤖 AI-Powered Business Optimization Assistant</h1>
        <p>
          Upload your data, describe your problem, and let AI create & run
          custom optimization solutions
        </p>
      </header>

      <div className="content-columns">
        <div className="column chat-panel">
          <h3>💬 Business Analysis & Problem Setup</h3>
          <ChatContainer chatHistory={chatHistory} />

          <div className="input-area">
            {loading && <p>Loading...</p>}
            {error && <p className="error-message">{error}</p>}

            {!questionsCompleted &&
              currentQuestionIndex < INITIAL_QUESTIONS.length && (
                <QuestionForm
                  question={INITIAL_QUESTIONS[currentQuestionIndex]}
                  onSubmit={handleAnswerSubmit}
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestions={INITIAL_QUESTIONS.length}
                  onBack={() =>
                    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                  }
                  canGoBack={currentQuestionIndex > 0}
                />
              )}

            {questionsCompleted && !uploadedDataInfo && (
              <div className="data-upload-section">
                <h3>📁 Upload Your Data</h3>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
                <p>Upload a CSV file containing your optimization data.</p>
              </div>
            )}

            {uploadedDataInfo && !optimizationResults && (
              <div className="optimization-trigger-section">
                <h3>🚀 Ready to Optimize!</h3>
                <p>
                  Your data is uploaded. Click below to let AI analyze your
                  problem and generate optimization solutions.
                </p>
                <button
                  className="primary-button"
                  onClick={handleStartOptimization}
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "🚀 START OPTIMIZATION ANALYSIS"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setUploadedDataInfo(null)}
                  disabled={loading}
                >
                  📝 Edit Data
                </button>
                <div className="data-preview">
                  <h4>📊 Data Preview</h4>
                  <table>
                    <thead>
                      <tr>
                        {uploadedDataInfo.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedDataInfo.preview.map((row, idx) => (
                        <tr key={idx}>
                          {uploadedDataInfo.columns.map((col) => (
                            <td key={`${idx}-${col}`}>{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p>
                    Shape: {uploadedDataInfo.shape[0]} rows,{" "}
                    {uploadedDataInfo.shape[1]} columns
                  </p>
                </div>
              </div>
            )}

            {optimizationResults && (
              <div className="follow-up-section">
                <h3>💭 Ask Follow-up Questions</h3>
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="Ask anything about your results or request modifications..."
                />
                <button onClick={handleFollowUpQuestion} disabled={loading}>
                  Send Question
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="column solution-panel">
          <h3>📊 Optimization Solution</h3>
          <SolutionDisplay
            optimizationResults={optimizationResults}
            problemType={problemType}
            aiExplanation={aiExplanation}
            isLoading={loading}
          />
        </div>
      </div>

      <footer>
        <button onClick={handleReset} className="reset-button">
          🔄 Start Over
        </button>
        <p>
          <strong>🤖 Powered by Google Gemini AI + Gurobi Optimization</strong>{" "}
          | <i>Upload CSV data and let AI solve your optimization problems</i>
        </p>
      </footer>
    </div>
  );
}

export default App;
