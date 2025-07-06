from flask import Flask, request, jsonify, session, make_response
from flask_cors import CORS
import pandas as pd
import numpy as np
import requests
import json
import re
import io
import os
import sys
from dotenv import load_dotenv

# Import gurobipy if installed. This will not run if Gurobi is not set up correctly.
try:
    import gurobipy as gp
    from gurobipy import GRB, quicksum, Model
except ImportError:
    gp = None
    GRB = None
    quicksum = None
    Model = None
    print("Warning: Gurobipy not found. Optimization functions will be disabled.")

# Load environment variables from .env file
load_dotenv()


app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_strong_secret_key_here'
CORS(app, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
], supports_credentials=True)

# Handle preflight OPTIONS requests


# --- CONFIGURATION ---
CONFIG = {
    "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY"),
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY"),
    "MAX_RETRIES": 3,
    "TIMEOUT": 60
}

# --- Session Management (Simplified for this example) ---
# In a real application, you'd use a proper session management system
# e.g., Flask-Session, a database, or Redis to store per-user state.
# For simplicity, we'll use a dictionary, which is NOT suitable for production
# as it's not scalable and not persistent across server restarts.
user_sessions = {} # {session_id: {"user_data": {}, "uploaded_data": None, "gemini_generated_code": None, ...}}

def get_session_data(session_id):
    if session_id not in user_sessions:
        user_sessions[session_id] = {
            "user_data": {},
            "uploaded_data": None,
            "gemini_generated_code": None,
            "problem_type": None,
            "optimization_results": None,
            "ai_explanation": None,
            "questions_completed": False,
            "chat_history": [{"role": "bot", "content": "Hello! I'm your AI Business Optimization Assistant. Let's start by understanding your business."}]
        }
    return user_sessions[session_id]

# --- AI INTEGRATION (Modified for Flask) ---
# You can switch between Gemini and OpenAI by uncommenting the relevant parts
# and ensuring the API key is set.

# Helper function for Gemini (as per your original code)
def get_gemini_response(prompt, context=""):
    api_key = CONFIG["GEMINI_API_KEY"]
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        return {"error": "Please configure your Gemini API key."}

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    full_prompt = f"""
    You are an expert optimization consultant and Python programmer specializing in operations research and Gurobi optimization.

    Context: {context}

    User Request: {prompt}

    Please provide detailed, actionable responses. Use markdown formatting for clarity.
    """
    data = {
        "contents": [{
            "parts": [{
                "text": full_prompt
            }]
        }]
    }
    try:
        response = requests.post(url, headers=headers, json=data, timeout=CONFIG["TIMEOUT"])
        response.raise_for_status() # Raise an exception for HTTP errors
        result = response.json()
        if 'candidates' in result and len(result['candidates']) > 0:
            return {"success": result['candidates'][0]['content']['parts'][0]['text']}
        else:
            return {"error": "I couldn't generate a response. Please try again."}
    except requests.exceptions.Timeout:
        return {"error": "API request timed out. Please try again."}
    except requests.exceptions.RequestException as e:
        return {"error": f"API Error: {e} - {response.text if 'response' in locals() else ''}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}

# Helper function for OpenAI (New)
def get_openai_response(prompt, context="", model="gpt-3.5-turbo"):
    api_key = CONFIG["OPENAI_API_KEY"]
    if not api_key or api_key == "YOUR_OPENAI_API_KEY":
        return {"error": "Please configure your OpenAI API key."}

    # Using the official OpenAI Python client is recommended for robust error handling and features.
    # For a simple requests-based example:
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    messages = [
        {"role": "system", "content": "You are an expert optimization consultant and Python programmer specializing in operations research and Gurobi optimization."},
        {"role": "user", "content": f"Context: {context}\n\nUser Request: {prompt}\n\nPlease provide detailed, actionable responses. Use markdown formatting for clarity."}
    ]

    data = {
        "model": model,
        "messages": messages,
        "max_tokens": 1500, # Adjust as needed
        "temperature": 0.7
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=CONFIG["TIMEOUT"])
        response.raise_for_status()
        result = response.json()
        if 'choices' in result and len(result['choices']) > 0:
            return {"success": result['choices'][0]['message']['content']}
        else:
            return {"error": "I couldn't generate a response from OpenAI. Please try again."}
    except requests.exceptions.Timeout:
        return {"error": "OpenAI API request timed out. Please try again."}
    except requests.exceptions.RequestException as e:
        return {"error": f"OpenAI API Error: {e} - {response.text if 'response' in locals() else ''}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred with OpenAI: {str(e)}"}


# Function to choose which AI model to use
def get_ai_response(prompt, context=""):
    # You can implement logic here to choose between Gemini and OpenAI
    # For now, let's stick to Gemini as per your initial code, but you can easily switch.
    # To use OpenAI:
    # return get_openai_response(prompt, context)
    return get_gemini_response(prompt, context)


def identify_problem_and_generate_code(session_data):
    user_data = session_data["user_data"]
    uploaded_data = session_data["uploaded_data"]

    context = f"""
    Business Information:
    - Type: {user_data.get('business_type', 'Not specified')}
    - Location: {user_data.get('business_location', 'Not specified')}
    - Goal: {user_data.get('optimization_goal', 'Not specified')}
    - Constraints: {', '.join(user_data.get('constraints', []))}
    - Budget: {user_data.get('budget_range', 'Not specified')}
    - Time Horizon: {user_data.get('time_horizon', 'Not specified')}
    - Problem Description: {user_data.get('data_description', 'Not specified')}

    Uploaded Data Preview:
    {uploaded_data.head(10).to_string() if uploaded_data is not None else 'No data uploaded'}

    Data Shape: {uploaded_data.shape if uploaded_data is not None else 'No data'}
    Data Columns: {list(uploaded_data.columns) if uploaded_data is not None else 'No columns'}
    """

    prompt = f"""
    Based on the business information and data provided, please:

    1. **Identify the optimization problem type** (e.g., Knapsack, Transportation, Assignment, Traveling Salesman, Inventory Optimization, Production Planning, etc.)

    2. **Generate complete Python code using Gurobi** that:
        - Imports necessary libraries (gurobipy, pandas, numpy)
        - Reads the data from a pandas DataFrame called 'data'
        - Sets up the optimization model with appropriate variables, constraints, and objective
        - Solves the problem
        - Returns results in a structured format (dictionary). Ensure the return statement is `return result_dict`.
        - Includes error handling (e.g., for infeasible models).

    3. **Format your response as follows:**
        ```
        PROBLEM_TYPE: [Type of optimization problem]

        EXPLANATION: [Brief explanation of why this problem type fits]

        PYTHON_CODE:
        ```python
        # Your complete Gurobi code here, make sure it's a function that takes 'data' as input
        # and returns a dictionary of results. Example:
        # def solve_optimization(data):
        #     # Gurobi model setup and solve
        #     # ...
        #     return {{"objective_value": model.ObjVal, "variables": {{...}}}}
        ```
        ```

    Make sure the code:
    - Is production-ready and handles edge cases
    - Uses variable names that match the actual data columns if applicable
    - Includes appropriate constraints based on the business context
    - Returns meaningful results as a dictionary
    - Has proper error handling
    """
    return get_ai_response(prompt, context)

def execute_generated_code(code_string, data):
    if gp is None:
        return None, "Gurobipy is not installed or configured correctly on the server."
    try:
        # Create a dictionary to serve as the execution environment for the generated code
        namespace = {
            'gurobipy': gp,
            'Model': Model,
            'GRB': GRB,
            'quicksum': quicksum,
            'pd': pd,
            'np': np,
            'data': data, # Pass the DataFrame directly
        }

        # Use a StringIO buffer to capture stdout/stderr from the executed code
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        redirected_output = io.StringIO()
        redirected_error = io.StringIO()

        try:
            sys.stdout = redirected_output
            sys.stderr = redirected_error
            
            # Execute the function definition. Assume the code defines a single function.
            exec(code_string, namespace)

            # Find the function name (assume it's the first 'def ...' in the code)
            match = re.search(r'def (\w+)\(', code_string)
            if match:
                func_name = match.group(1)
                if func_name in namespace and callable(namespace[func_name]):
                    # Call the function with the 'data' DataFrame
                    result = namespace[func_name](data)
                    return result, None
                else:
                    return None, f"Function '{func_name}' not found or not callable after execution."
            else:
                return None, "No function definition found in generated code."
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            # You can log redirected_output.getvalue() and redirected_error.getvalue()
            # for debugging purposes if the Gurobi execution fails silently.

    except Exception as e:
        return None, f"Error executing code: {str(e)}"

def explain_results_with_ai(results, problem_type, session_data):
    context = f"""
    Problem Type: {problem_type}
    Business Context: {session_data["user_data"]}
    """

    prompt = f"""
    I have solved an optimization problem and got the following technical results:

    Results: {results}

    Please explain these results in a simple, business-friendly way for a {session_data["user_data"].get('business_type', 'business owner')}.
    
    Your explanation should:
    1. **Summarize the key findings** in plain language
    2. **Highlight the most important numbers** and what they mean
    3. **Provide actionable recommendations** based on the results
    4. **Include any visualizations suggestions** (describe what charts would be helpful for these results)
    5. **Use markdown formatting** with headers, bullet points, tables, etc.
    6. **Include emojis** to make it more engaging
    7. **Suggest specific next steps** the business should take

    Format your response with clear sections and make it as comprehensive as possible.
    """
    return get_ai_response(prompt, context)

def extract_code_from_response(response_content):
    code_pattern = r'```python\s*(.*?)\s*```'
    matches = re.findall(code_pattern, response_content, re.DOTALL)
    if matches:
        code = matches[0].strip()
        # Remove any __main__ block and print statements
        code = re.sub(r"if __name__ == .+?\n(.|\n)*", "", code)
        code = re.sub(r"print\(.*?\)", "", code)
        return code
    return None

def extract_problem_type(response_content):
    if 'PROBLEM_TYPE:' in response_content:
        lines = response_content.split('\n')
        for line in lines:
            if line.strip().startswith('PROBLEM_TYPE:'):
                return line.replace('PROBLEM_TYPE:', '').strip()
    return "Unknown Problem Type"


# --- FLASK ROUTES ---

@app.route('/')
def index():
    return "Backend is running!"


@app.route('/api/init_session', methods=['GET'])
def init_session():
    # Generate a simple session ID (in production, use a more robust method like UUIDs)
    session_id = str(np.random.randint(100000, 999999))
    get_session_data(session_id) # Initialize session
    return jsonify({"session_id": session_id, "chat_history": user_sessions[session_id]["chat_history"]})

@app.route('/api/submit_answer', methods=['POST'])
def submit_answer():
    data = request.json
    session_id = data.get('session_id')
    question_key = data.get('question_key')
    user_answer = data.get('user_answer')
    current_question_index = data.get('current_question_index')
    total_questions = data.get('total_questions')
    
    session = get_session_data(session_id)

    # Update user data and chat history
    session["user_data"][question_key] = user_answer
    session["chat_history"].append({"role": "user", "content": f"**{question_key.replace('_', ' ').title()}:** {user_answer}"})

    # Determine if all initial questions are completed
    is_all_questions_completed = (current_question_index + 1 >= total_questions)

    response_message = ""
    if is_all_questions_completed:
        session["questions_completed"] = True # Set to True once all initial questions are done
        response_message = "Great! Now please upload your data file (CSV format) so I can analyze your specific optimization problem."
    else:
        # If not all questions are completed, ensure 'questions_completed' is not True prematurely
        session["questions_completed"] = False 

    if response_message:
        session["chat_history"].append({"role": "bot", "content": response_message})

    # Prepare response for frontend
    response_data = {
        "status": "success",
        "message": "Answer submitted",
        # Send the boolean flag indicating if all initial questions are completed
        "questions_completed": is_all_questions_completed, 
        "chat_history": session["chat_history"] # IMPORTANT: Include chat_history for frontend update
    }
    return jsonify(response_data)



@app.route('/api/upload_data', methods=['POST'])
def upload_data():
    session_id = request.form.get('session_id')
    session = get_session_data(session_id)

    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"}), 400
    
    if file and file.filename.endswith('.csv'):
        try:
            df = pd.read_csv(io.StringIO(file.read().decode('utf-8')))
            session["uploaded_data"] = df
            session["chat_history"].append({"role": "user", "content": f"Uploaded data file: {file.filename}"})
            session["chat_history"].append({"role": "bot", "content": f"✅ Data uploaded successfully! Shape: {df.shape}"})
            return jsonify({
                "status": "success",
                "message": f"Data uploaded successfully! Shape: {df.shape}",
                "data_preview": df.head().to_dict(orient='records'),
                "data_shape": df.shape,
                "data_columns": list(df.columns),
                "chat_history": session["chat_history"]
            })
        except Exception as e:
            return jsonify({"status": "error", "message": f"Error reading file: {str(e)}"}), 400
    return jsonify({"status": "error", "message": "Invalid file type. Please upload a CSV."}), 400
@app.route('/api/start_optimization', methods=['POST'])
def start_optimization():
    data = request.json
    session_id = data.get('session_id')
    session = get_session_data(session_id)

    if session["uploaded_data"] is None:
        return jsonify({"status": "error", "message": "No data uploaded. Please upload your data first."}), 400

    session["chat_history"].append({"role": "bot", "content": "🔍 Analyzing your problem and generating optimization code..."})
    
    gemini_response_obj = identify_problem_and_generate_code(session)
    if "error" in gemini_response_obj:
        error_msg = gemini_response_obj["error"]
        session["chat_history"].append({"role": "bot", "content": f"❌ **AI Analysis Error:**\n{error_msg}"})
        return jsonify({"status": "error", "message": error_msg, "chat_history": session["chat_history"]})

    gemini_response_content = gemini_response_obj["success"]
    session["gemini_generated_code"] = extract_code_from_response(gemini_response_content)
    session["problem_type"] = extract_problem_type(gemini_response_content)

    session["chat_history"].append({"role": "bot", "content": f"**Problem Analysis Complete!**\n\n{gemini_response_content}"})

    if session["gemini_generated_code"]:
        session["chat_history"].append({"role": "bot", "content": "⚙️ Running optimization..."})
        results, error = execute_generated_code(session["gemini_generated_code"], session["uploaded_data"])

        if error:
            # CORRECTED LINE HERE
            session["chat_history"].append({"role": "bot", "content": f"❌ **Execution Error:**\n{error}"}) 
            return jsonify({"status": "error", "message": error, "chat_history": session["chat_history"]})
        else:
            session["optimization_results"] = results
            session["chat_history"].append({"role": "bot", "content": "✅ **Optimization Complete!** Check the Solution panel for detailed results."})
            return jsonify({
                "status": "success",
                "message": "Optimization completed.",
                "optimization_results": results,
                "problem_type": session["problem_type"],
                "chat_history": session["chat_history"]
            })
    else:
        session["chat_history"].append({"role": "bot", "content": "❌ **Could not extract code from AI response.** Please try again or refine your input."})
        return jsonify({"status": "error", "message": "Could not extract code.", "chat_history": session["chat_history"]})

@app.route('/api/get_ai_explanation', methods=['POST'])
def get_ai_explanation():
    data = request.json
    session_id = data.get('session_id')
    session = get_session_data(session_id)

    if not session["optimization_results"]:
        return jsonify({"status": "error", "message": "No optimization results to explain."}), 400
    
    ai_explanation_obj = explain_results_with_ai(
        session["optimization_results"], 
        session["problem_type"], 
        session
    )
    
    if "error" in ai_explanation_obj:
        error_msg = ai_explanation_obj["error"]
        session["chat_history"].append({"role": "bot", "content": f"❌ **Explanation Error:**\n{error_msg}"})
        return jsonify({"status": "error", "message": error_msg, "chat_history": session["chat_history"]})

    session["ai_explanation"] = ai_explanation_obj["success"]
    return jsonify({
        "status": "success",
        "ai_explanation": session["ai_explanation"],
        "chat_history": session["chat_history"]
    })

@app.route('/api/followup_question', methods=['POST'])
def followup_question():
    data = request.json
    session_id = data.get('session_id')
    user_question = data.get('user_question')
    session = get_session_data(session_id)

    session["chat_history"].append({"role": "user", "content": user_question})

    context = f"""
    Problem Type: {session["problem_type"]}
    Optimization Results: {session["optimization_results"]}
    User Data: {session["user_data"]}
    """

    ai_response_obj = get_ai_response(user_question, context)
    if "error" in ai_response_obj:
        error_msg = ai_response_obj["error"]
        session["chat_history"].append({"role": "bot", "content": f"❌ **AI Response Error:**\n{error_msg}"})
        return jsonify({"status": "error", "message": error_msg, "chat_history": session["chat_history"]})

    ai_response_content = ai_response_obj["success"]
    session["chat_history"].append({"role": "bot", "content": ai_response_content})

    return jsonify({"status": "success", "chat_history": session["chat_history"]})


@app.route('/api/reset_session', methods=['POST'])
def reset_session():
    session_id = request.json.get('session_id')
    if session_id in user_sessions:
        del user_sessions[session_id]
    return jsonify({"status": "success", "message": "Session reset."})


if __name__ == '__main__':
    app.run(debug=True, port=5000) # Run on port 5000