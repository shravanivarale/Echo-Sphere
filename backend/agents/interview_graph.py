"""
LangGraph-style Interview State Machine.
In MOCK_MODE=true, returns scripted realistic responses.
In MOCK_MODE=false, calls configured LLM.

The state is:
{
    "session_id": "",
    "candidate_name": "",
    "role": "",
    "conversation_history": [],
    "current_question": "",
    "latest_answer": "",
    "active_interviewer": "SYSTEM_ARCHITECT" | "PRODUCT_MANAGER",
    "tech_score": {},
    "pm_score": {},
    "sandbox_state": {},
    "transcript": [],
    "turn_count": 0
}
"""

import os
import random
from typing import TypedDict, List, Dict, Any

MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"


# ---------------------------------------------------------------------------
# Keyword classifiers for interviewer selection
# ---------------------------------------------------------------------------

TECH_SIGNALS = [
    "database", "api", "scalab", "latency", "cach", "reliab", "architect",
    "distribut", "redis", "sql", "nosql", "cloud", "docker", "server",
    "microservice", "load", "queue", "event", "async", "sync", "http",
    "rest", "graphql", "security", "auth", "encrypt", "storage", "index",
    "shard", "replica", "deploy", "network", "protocol", "bandwidth",
]

PM_SIGNALS = [
    "user", "customer", "business", "cost", "prioriti", "mvp", "revenue",
    "requirem", "stakeholder", "roadmap", "feature", "market", "feedback",
    "metrics", "kpi", "sprint", "agile", "ship", "deadline", "budget",
    "scope", "product", "analytics", "retention", "conversion",
]


def _detect_interviewer(text: str) -> str:
    """Detect which interviewer should respond based on keyword signals."""
    lower = text.lower()
    tech_score = sum(1 for kw in TECH_SIGNALS if kw in lower)
    pm_score   = sum(1 for kw in PM_SIGNALS if kw in lower)

    if pm_score > tech_score:
        return "PRODUCT_MANAGER"
    return "SYSTEM_ARCHITECT"  # default to tech


# ---------------------------------------------------------------------------
# Mock response banks
# ---------------------------------------------------------------------------

MOCK_OPENING_QUESTIONS = {
    "SYSTEM_ARCHITECT": [
        "Walk me through how you would design a real-time messaging system that supports 10 million concurrent users. What are the key components and trade-offs you would consider?",
        "You're tasked with designing a distributed caching layer for an e-commerce platform. How would you approach this, and what database technologies would you choose?",
        "Describe the architecture for a video streaming service like YouTube. Focus on the CDN strategy, storage, and how you handle peak traffic.",
    ],
    "PRODUCT_MANAGER": [
        "Your team has three features to ship in Q2: performance improvements, a new payment flow, and a user analytics dashboard. How do you prioritize these?",
        "A key enterprise customer is threatening to churn because a core feature is broken. Your team is mid-sprint on a high-priority roadmap item. How do you handle this?",
        "You have a 6-week runway to ship an MVP. What is your process for deciding what's in scope and what gets cut?",
    ],
}

MOCK_FOLLOWUPS = {
    "SYSTEM_ARCHITECT": [
        "Interesting. What happens to your system when the primary database goes down? Walk me through your failover strategy.",
        "You mentioned caching — what's your eviction policy, and how do you handle cache stampedes under heavy load?",
        "How would you ensure data consistency across distributed nodes, especially during a network partition?",
        "What's your monitoring strategy for this system? How would you detect and alert on latency spikes?",
        "Let's talk about the database choice. Why that one specifically? What are the trade-offs vs an alternative like Cassandra or PostgreSQL?",
        "How does this architecture hold up if traffic spikes 10x overnight? Walk me through the scaling steps.",
        "You mentioned microservices — how do you handle service discovery and inter-service communication failures?",
        "What would you do differently if the system had a strict budget of $5,000/month on cloud infrastructure?",
    ],
    "PRODUCT_MANAGER": [
        "How would you measure whether this feature was actually successful post-launch?",
        "What if engineering says your MVP plan still requires 12 weeks? What do you cut further?",
        "Walk me through how you would communicate this trade-off decision to an executive stakeholder.",
        "A/B test results show a 3% lift but the engineering cost to productize is very high. What do you do?",
        "How do you align cross-functional teams — engineering, design, data — when priorities conflict?",
        "Your analytics show 60% of users never use the feature you just shipped. What's your response?",
        "How do you decide when a product has reached MVP vs. when it still needs more work before launch?",
    ],
}

MOCK_ASSESSMENTS = {
    "SYSTEM_ARCHITECT": [
        "Thank you. You've shown a solid grasp of distributed systems fundamentals. I'd like to see more depth on failure scenarios and trade-off analysis.",
        "Good thinking on the high-level components. In a real design review, I'd push harder on the consistency vs. availability trade-offs.",
    ],
    "PRODUCT_MANAGER": [
        "I appreciate the structured thinking around prioritization. In practice, I'd want to see clearer metrics tied to business outcomes.",
        "Good product instincts. The next step would be to tie your decisions more explicitly to revenue impact and user retention data.",
    ],
}


# ---------------------------------------------------------------------------
# State machine node functions
# ---------------------------------------------------------------------------

def select_interviewer_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: selects the active interviewer based on latest answer context.
    On the first turn, use the role to pick a starting interviewer.
    """
    turn = state.get("turn_count", 0)
    latest_answer = state.get("latest_answer", "")

    if turn == 0:
        # First turn: default to System Architect
        interviewer = "SYSTEM_ARCHITECT"
    else:
        interviewer = _detect_interviewer(latest_answer)

    state["active_interviewer"] = interviewer
    return state


def generate_question_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: generates the next question.
    In MOCK_MODE, picks from scripted banks. In LIVE mode, calls LLM.
    """
    interviewer = state.get("active_interviewer", "SYSTEM_ARCHITECT")
    turn = state.get("turn_count", 0)

    if MOCK_MODE:
        if turn == 0:
            bank = MOCK_OPENING_QUESTIONS.get(interviewer, MOCK_OPENING_QUESTIONS["SYSTEM_ARCHITECT"])
        else:
            bank = MOCK_FOLLOWUPS.get(interviewer, MOCK_FOLLOWUPS["SYSTEM_ARCHITECT"])
        question = random.choice(bank)
    else:
        # LIVE mode placeholder — replace with actual LLM call
        raise NotImplementedError("Live LLM mode not yet implemented. Set MOCK_MODE=true.")

    state["current_question"] = question
    return state


def analyze_answer_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: analyzes the candidate's answer and updates scores.
    In MOCK_MODE, applies a simple heuristic scoring based on answer length/keywords.
    """
    answer = state.get("latest_answer", "")
    interviewer = state.get("active_interviewer", "SYSTEM_ARCHITECT")

    # Heuristic scoring for mock mode
    # Word count bands: <20=3, 20-50=5, 50-100=6, 100-150=7, 150-200=8, 200+=9
    word_count = len(answer.split())
    if word_count < 20:
        base = 3
    elif word_count < 50:
        base = 5
    elif word_count < 100:
        base = 6
    elif word_count < 150:
        base = 7
    elif word_count < 200:
        base = 8
    else:
        base = 9

    tech_keywords = sum(1 for kw in TECH_SIGNALS if kw in answer.lower())
    pm_keywords   = sum(1 for kw in PM_SIGNALS if kw in answer.lower())

    # Keyword bonus (+0.5 per relevant keyword, capped at +2)
    if interviewer == "SYSTEM_ARCHITECT":
        keyword_bonus = min(2, tech_keywords * 0.5)
    else:
        keyword_bonus = min(2, pm_keywords * 0.5)

    depth_score = min(10, round(base + keyword_bonus, 1))

    if interviewer == "SYSTEM_ARCHITECT":
        state["tech_score"] = {
            "depth": depth_score,
            "technical_keywords": tech_keywords,
            "estimated_level": "Senior" if depth_score >= 7 else "Mid" if depth_score >= 4 else "Junior",
        }
    else:
        state["pm_score"] = {
            "depth": depth_score,
            "product_keywords": pm_keywords,
            "estimated_level": "Senior" if depth_score >= 7 else "Mid" if depth_score >= 4 else "Junior",
        }

    # Append to transcript
    transcript_entry = {
        "role": "candidate",
        "text": answer,
        "interviewer_context": interviewer,
    }
    state.setdefault("transcript", []).append(transcript_entry)
    return state


def build_response_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assembles the final AI response dict: interviewer + question.
    """
    state["turn_count"] = state.get("turn_count", 0) + 1
    interviewer = state["active_interviewer"]
    question = state["current_question"]

    # Append AI question to transcript
    state.setdefault("transcript", []).append({
        "role": "interviewer",
        "interviewer": interviewer,
        "text": question,
    })

    return state


# ---------------------------------------------------------------------------
# Main entry point — simulates LangGraph .invoke()
# ---------------------------------------------------------------------------

def run_interview_graph(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs the interview state machine for one turn.
    Equivalent to a LangGraph compiled graph .invoke(state).

    Steps:
    1. Analyze last answer (if any)
    2. Select appropriate interviewer
    3. Generate next question
    4. Update state
    """
    # Step 1: Analyze answer (skip on first turn)
    if state.get("latest_answer"):
        state = analyze_answer_node(state)

    # Step 2: Select interviewer
    state = select_interviewer_node(state)

    # Step 3: Generate question
    state = generate_question_node(state)

    # Step 4: Finalize
    state = build_response_node(state)

    return state


# ---------------------------------------------------------------------------
# Assessment generator
# ---------------------------------------------------------------------------

def generate_assessment(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generates final assessment report from interview state."""
    tech_score = state.get("tech_score", {})
    pm_score   = state.get("pm_score", {})
    transcript = state.get("transcript", [])

    turn_count = state.get("turn_count", 0)

    tech_depth = tech_score.get("depth", 0)
    pm_depth   = pm_score.get("depth", 0)

    overall = round((tech_depth + pm_depth) / 2, 1) if (tech_depth or pm_depth) else 5.0
    overall = max(1.0, min(10.0, overall))

    candidate_turns = [t for t in transcript if t.get("role") == "candidate"]
    total_words = sum(len(t.get("text", "").split()) for t in candidate_turns)
    avg_words = total_words // max(1, len(candidate_turns))

    comm_score = min(10, max(1, avg_words // 15))

    strengths = []
    weaknesses = []

    if tech_depth >= 7:
        strengths.append("Strong technical depth and system design vocabulary.")
    elif tech_depth < 4:
        weaknesses.append("Technical explanations lacked sufficient depth.")

    if pm_depth >= 7:
        strengths.append("Excellent product thinking and prioritization instincts.")
    elif pm_depth < 4 and pm_score:
        weaknesses.append("Product impact thinking could be strengthened with more business context.")

    if comm_score >= 7:
        strengths.append("Clear, detailed communication with well-structured answers.")
    else:
        weaknesses.append("Answers were brief — more elaboration on trade-offs would help.")

    if not strengths:
        strengths.append("Showed engagement with the interview process.")
    if not weaknesses:
        weaknesses.append("No major weaknesses identified in this mock session.")

    report = {
        "candidate_name": state.get("candidate_name", ""),
        "role": state.get("role", ""),
        "overall_score": overall,
        "technical_score": tech_depth or 0,
        "product_score": pm_depth or 0,
        "communication_score": comm_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "turn_count": turn_count,
        "transcript_length": len(transcript),
        "recommendation": (
            "Strong Hire" if overall >= 8 else
            "Hire" if overall >= 6 else
            "Borderline" if overall >= 4 else
            "No Hire"
        ),
        "summary": (
            f"{state.get('candidate_name', 'The candidate')} demonstrated "
            f"{'strong' if overall >= 7 else 'moderate' if overall >= 5 else 'developing'} "
            f"capabilities across {turn_count} interview turns. "
            f"Overall score: {overall}/10."
        ),
    }
    return report
