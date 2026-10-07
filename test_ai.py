import os
import sys
from dotenv import load_dotenv

# Load env before importing app
load_dotenv()

from app.services.ai_services import generate_first_question, evaluate_answer_and_generate_next, generate_session_summary

def run_tests():
    print("Testing generate_first_question...")
    q1 = generate_first_question("Frontend Developer", "Junior", "React and JavaScript basics")
    print(f"Generated Q1: {q1}\n")

    print("Testing evaluate_answer_and_generate_next...")
    past_qas = [{"question": q1, "answer": "I have used React for 1 year."}]
    eval1 = evaluate_answer_and_generate_next("Frontend Developer", "Junior", "React and JavaScript basics", past_qas, "I prefer functional components over class components because they are simpler.")
    print(f"Evaluation: {eval1}\n")

    print("Testing generate_session_summary...")
    past_qas.append({"question": eval1.get("next_question", ""), "answer": "Yes, hooks like useState and useEffect are great.", "score": eval1.get("score", 0)})
    summary = generate_session_summary("Frontend Developer", past_qas)
    print(f"Summary: {summary}\n")

    print("All tests completed successfully!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
