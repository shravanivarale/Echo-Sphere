"""
Multi-Agent Orchestrated Interview State Machine for EchoSphere.

Architecture:
1. Collectively Intelligent Evaluator Agent ("Panel Director"):
   - Analyzes candidate responses dynamically using LLM evaluation.
   - Classifies state into: BRILLIANT, DECENT_GOOD, WRONG_MISCONCEPTION, PAUSING_SEARCHING_WORDS, CLARIFICATION_NEEDED, CANNOT_ANSWER_SKIP.
   - Manages clarification attempts (1-2 reframes question on same topic; 3+ gracefully pivots topic).
   - Generates opening panel greeting on Turn 0.
   - Routes between System Architect (Dr. Alex Chen) and Product Manager (Sarah Mitchell).

2. System Architect Agent (Dr. Alex Chen):
   - Focuses on architecture, latency, microservices, databases, scaling, trade-offs.
   - Speaks with fluent Indian English cadence and natural speech remarks.

3. Product Manager Agent (Sarah Mitchell):
   - Focuses on user stories, metrics, prioritization, roadmap scoping, ROI.
   - Speaks with fluent Indian English cadence and natural speech remarks.
"""

import os
import random
import json
import requests
from typing import Dict, Any, List

INITIAL_PANEL_GREETING = (
    "Welcome to EchoSphere! I am Dr. Alex Chen alongside Sarah Mitchell. "
    "This panel interview is driven by AI agents, and you can respond naturally just as you would to a live human interviewer. "
)

def is_mock_mode() -> bool:
    return os.getenv("MOCK_MODE", "true").lower() == "true"

def call_llm(prompt: str, system_prompt: str = "") -> str:
    """Helper to call OpenAI or Anthropic API directly via requests."""
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if openai_key:
        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        for model in ["gpt-4o-mini", "gpt-3.5-turbo", "gpt-4o"]:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 350
            }
            try:
                res = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=12)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    if content:
                        return content
                else:
                    print(f"[LLM] OpenAI {model} returned HTTP {res.status_code}: {res.text[:150]}")
            except Exception as e:
                print(f"[LLM ERROR] OpenAI call with {model} failed: {e}")

    if anthropic_key:
        headers = {
            "x-api-key": anthropic_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 350,
            "messages": [{"role": "user", "content": prompt}]
        }
        if system_prompt:
            payload["system"] = system_prompt
        try:
            res = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=12)
            if res.status_code == 200:
                data = res.json()
                content = data["content"][0]["text"].strip()
                if content:
                    return content
            else:
                print(f"[LLM] Anthropic returned HTTP {res.status_code}: {res.text[:150]}")
        except Exception as e:
            print(f"[LLM ERROR] Anthropic call failed: {e}")

    return ""


# ---------------------------------------------------------------------------
# Collectively Intelligent Evaluator Node
# ---------------------------------------------------------------------------

def evaluate_candidate_response(last_ans: str, current_question: str, role: str) -> dict:
    """
    Evaluates candidate response using LLM reasoning.
    Returns dynamic state classification + remark prefix.
    """
    if not last_ans or len(last_ans.strip()) == 0:
        return {
            "state": "DECENT_GOOD",
            "remark": "Right then...",
            "action": "CONTINUE_SAME_TOPIC"
        }

    system_prompt = (
        "You are an expert AI Panel Interview Evaluator. "
        "Analyze the candidate's answer and classify it into EXACTLY ONE of the following 6 states:\n"
        "- BRILLIANT: Excellent, deep, impressive, articulate answer.\n"
        "- DECENT_GOOD: Solid, correct answer.\n"
        "- WRONG_MISCONCEPTION: Candidate answered with a flawed assumption or technical misconception.\n"
        "- PAUSING_SEARCHING_WORDS: Candidate is struggling to articulate, searching for words, or pausing ('um...', 'how do I put this...').\n"
        "- CLARIFICATION_NEEDED: Candidate asked to clarify, repeat, rephrase, or elaborate the question ('can you repeat', 'what do you mean', 'could you elaborate').\n"
        "- CANNOT_ANSWER_SKIP: Candidate explicitly gave up or requested to skip ('I don't know', 'I can't answer', 'pass').\n\n"
        "Return a raw JSON object with keys:\n"
        "  \"state\": string,\n"
        "  \"remark\": string (a short 2-5 word natural remark like 'That's impressive!', 'Fair point', 'I see your point, but keep in mind...', 'Do you mean...?', 'No problem at all!'),\n"
        "  \"action\": string ('INCREASE_DIFFICULTY', 'CONTINUE_SAME_TOPIC', 'CORRECT_AND_RETRY', 'HELP_PREDICT_WORDS', 'REFRAME_QUESTION', 'PIVOT_NEW_TOPIC')\n"
        "Respond ONLY with valid JSON."
    )
    user_prompt = f"Target Role: {role}\nActive Question: '{current_question}'\nCandidate Answer: '{last_ans}'"

    llm_res = call_llm(user_prompt, system_prompt)
    if llm_res:
        try:
            clean = llm_res.strip()
            if clean.startswith("```json"):
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif clean.startswith("```"):
                clean = clean.split("```")[1].split("```")[0].strip()
            data = json.loads(clean)
            if "state" in data and "remark" in data:
                return data
        except Exception:
            pass

    # Heuristic fallback if LLM JSON parsing fails
    lower = last_ans.lower()
    if any(w in lower for w in ["repeat", "clarify", "didn't catch", "didnt catch", "what do you mean", "elaborate", "pardon"]):
        return {"state": "CLARIFICATION_NEEDED", "remark": "No worries! Let me reframe that question for you...", "action": "REFRAME_QUESTION"}
    if any(w in lower for w in ["cant answer", "can't answer", "dont know", "don't know", "no idea", "skip", "pass"]):
        return {"state": "CANNOT_ANSWER_SKIP", "remark": "That's completely fine! Let's pivot to a different topic...", "action": "PIVOT_NEW_TOPIC"}
    if any(w in lower for w in ["um", "uh", "how to say", "trying to think", "word for it", "meaning"]):
        return {"state": "PAUSING_SEARCHING_WORDS", "remark": "Take your time... do you mean...", "action": "HELP_PREDICT_WORDS"}

    return {"state": "DECENT_GOOD", "remark": "Fair point... ", "action": "CONTINUE_SAME_TOPIC"}


TECH_SIGNALS = [
    "database", "api", "scalab", "latency", "cach", "reliab", "architect",
    "distribut", "redis", "sql", "nosql", "cloud", "docker", "server",
    "microservice", "load", "queue", "event", "async", "sync", "http",
    "rest", "graphql", "security", "auth", "encrypt", "storage", "index",
]

PM_SIGNALS = [
    "user", "customer", "business", "cost", "prioriti", "mvp", "revenue",
    "requirem", "stakeholder", "roadmap", "feature", "market", "feedback",
    "metrics", "kpi", "sprint", "agile", "ship", "deadline", "budget",
]

# ---------------------------------------------------------------------------
# Mock Question Banks per Persona & Job Role
# ---------------------------------------------------------------------------

SYSTEM_ARCHITECT_QUESTIONS = [
    "Walk me through how you would design a real-time messaging system supporting 10 million concurrent users. What key components, cache layers, and DB choices would you make?",
    "Suppose our primary database experiences a sudden replication lag spike during peak load. How would your architecture isolate read requests and prevent cascading failures?",
    "How would you design a distributed rate limiter to handle 100,000 requests per second across multi-region cloud deployments without creating a single point of failure?",
    "When choosing between strong consistency with PostgreSQL vs eventual consistency with Cassandra or Redis, how do you evaluate data integrity vs latency trade-offs?",
    "Describe how you would design an asynchronous event-driven pipeline for process processing using Kafka or RabbitMQ. How do you handle dead-letter queues and retry idempotency?",
]

PRODUCT_MANAGER_QUESTIONS = [
    "Suppose your engineering team has three major initiatives: technical debt refactoring, a payment funnel redesign, and user analytics dashboards. How do you prioritize these for the Q3 roadmap?",
    "A tier-1 enterprise client is threatening to churn unless we build a custom export tool, but your team is mid-sprint on an essential MVP feature. How do you communicate and negotiate this?",
    "What specific metrics and KPIs would you define to measure success post-launch for a newly released AI feature, and what threshold signals a pivot?",
    "If user research shows 50% of onboarded users drop off during the initial profile setup, what experiments or MVP changes would you propose to improve retention?",
    "How do you align cross-functional stakeholders—design, engineering, sales, and executive leadership—when opinions conflict on product scope?",
]


def orchestrator_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Top-level Orchestrator Agent ("Panel Director").
    Evaluates candidate state via collective intelligence, manages clarification count,
    and routes between System Architect and Product Manager.
    """
    latest_answer = state.get("latest_answer", "")
    turn = state.get("turn_count", 0)
    current_interviewer = state.get("active_interviewer", "SYSTEM_ARCHITECT")
    role = state.get("role", "Software Engineer")
    curr_q = state.get("current_question", "")

    if turn == 0:
        role_lower = role.lower()
        if "product" in role_lower or "pm" in role_lower or "manager" in role_lower:
            next_interviewer = "PRODUCT_MANAGER"
            reason = f"Role '{role}' selected. Initiating panel interview with Product Manager Sarah Mitchell."
        else:
            next_interviewer = "SYSTEM_ARCHITECT"
            reason = f"Role '{role}' selected. Initiating panel interview with System Architect Dr. Alex Chen."

        state["active_interviewer"] = next_interviewer
        state["orchestrator_decision"] = f"Orchestrator Decision: {reason}"
        state["eval_state"] = "GREETING"
        state["clarification_count"] = 0
        return state

    # Evaluate candidate response
    eval_res = evaluate_candidate_response(latest_answer, curr_q, role)
    eval_state = eval_res.get("state", "DECENT_GOOD")
    eval_remark = eval_res.get("remark", "Fair point... ")
    eval_action = eval_res.get("action", "CONTINUE_SAME_TOPIC")

    state["eval_state"] = eval_state
    state["eval_remark"] = eval_remark
    state["eval_action"] = eval_action

    # Clarification attempt tracking
    if eval_state == "CLARIFICATION_NEEDED":
        count = state.get("clarification_count", 0) + 1
        state["clarification_count"] = count
        if count <= 2:
            state["orchestrator_decision"] = (
                f"Orchestrator Decision: Candidate requested clarification (attempt {count}/2). "
                f"Directing {current_interviewer} to reframe and simplify the SAME question without penalizing."
            )
            state["active_interviewer"] = current_interviewer
            return state
        else:
            state["clarification_count"] = 0
            state["orchestrator_decision"] = (
                f"Orchestrator Decision: Candidate requested clarification {count} times. "
                f"Directing panel to gracefully transition to a new topic."
            )
    else:
        state["clarification_count"] = 0

    # Route interviewer based on keyword scores
    lower = latest_answer.lower()
    tech_score = sum(1 for kw in TECH_SIGNALS if kw in lower)
    pm_score   = sum(1 for kw in PM_SIGNALS if kw in lower)

    if pm_score > tech_score:
        next_interviewer = "PRODUCT_MANAGER"
        reason = f"Candidate emphasized product/business trade-offs (PM score {pm_score} vs Tech {tech_score}). Routing to Product Manager Sarah Mitchell."
    elif tech_score > pm_score:
        next_interviewer = "SYSTEM_ARCHITECT"
        reason = f"Candidate discussed technical architecture/scalability (Tech score {tech_score} vs PM {pm_score}). Routing to System Architect Dr. Alex Chen."
    else:
        next_interviewer = "PRODUCT_MANAGER" if current_interviewer == "SYSTEM_ARCHITECT" else "SYSTEM_ARCHITECT"
        reason = f"Balanced response detected ({eval_state}). Alternating active interviewer to {next_interviewer}."

    state["active_interviewer"] = next_interviewer
    state["orchestrator_decision"] = f"Orchestrator Decision: {reason}"
    return state


def analyze_answer_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates candidate's answer depth and updates technical or PM scores.
    """
    eval_state = state.get("eval_state", "DECENT_GOOD")
    interviewer = state.get("active_interviewer", "SYSTEM_ARCHITECT")
    answer = state.get("latest_answer", "")

    if eval_state == "CLARIFICATION_NEEDED":
        return state

    if eval_state in ["CANNOT_ANSWER_SKIP", "PAUSING_SEARCHING_WORDS"]:
        if interviewer == "SYSTEM_ARCHITECT":
            state["tech_score"] = {"depth": 5.0, "technical_keywords": 0, "estimated_level": "Developing"}
        else:
            state["pm_score"] = {"depth": 5.0, "product_keywords": 0, "estimated_level": "Developing"}
        return state

    words = len(answer.split())
    if eval_state == "BRILLIANT":
        base = 9.0
    elif words < 15:
        base = 4.5
    elif words < 40:
        base = 6.5
    elif words < 90:
        base = 8.0
    else:
        base = 9.0

    tech_kw = sum(1 for kw in TECH_SIGNALS if kw in answer.lower())
    pm_kw   = sum(1 for kw in PM_SIGNALS if kw in answer.lower())

    if interviewer == "SYSTEM_ARCHITECT":
        depth = min(10.0, round(base + min(1.0, tech_kw * 0.3), 1))
        state["tech_score"] = {
            "depth": depth,
            "technical_keywords": tech_kw,
            "estimated_level": "Senior Architect" if depth >= 8.5 else "Mid Level" if depth >= 5.5 else "Junior",
        }
    else:
        depth = min(10.0, round(base + min(1.0, pm_kw * 0.3), 1))
        state["pm_score"] = {
            "depth": depth,
            "product_keywords": pm_kw,
            "estimated_level": "Senior PM" if depth >= 8.5 else "Mid Level" if depth >= 5.5 else "Associate",
        }

    return state


def generate_question_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates dynamic, adaptive panel response.
    Ensures EVERY turn starts with a suitable contextual remark.
    Handles Turn 0 opening panel greeting.
    """
    interviewer = state.get("active_interviewer", "SYSTEM_ARCHITECT")
    turn = state.get("turn_count", 0)
    role = state.get("role", "Software Engineer")
    jd = state.get("job_description", "")
    last_ans = state.get("latest_answer", "")
    curr_q = state.get("current_question", "")

    eval_state = state.get("eval_state", "DECENT_GOOD")
    eval_remark = state.get("eval_remark", "Fair point... ")
    clarification_count = state.get("clarification_count", 0)

    speaker_name = "Dr. Alex Chen (System Architect)" if interviewer == "SYSTEM_ARCHITECT" else "Sarah Mitchell (Product Manager)"

    # Turn 0: Mandatory Opening Panel Greeting
    if turn == 0 and not last_ans:
        q_raw = SYSTEM_ARCHITECT_QUESTIONS[0] if interviewer == "SYSTEM_ARCHITECT" else PRODUCT_MANAGER_QUESTIONS[0]
        state["current_question"] = f"{INITIAL_PANEL_GREETING}To begin our panel interview, {q_raw}"
        return state

    # Live Mode LLM Prompt Formulation
    if not is_mock_mode():
        if eval_state == "BRILLIANT":
            system_prompt = (
                f"You are {speaker_name}, interviewing for {role}. Job Description: {jd[:250]}. "
                f"The candidate gave an impressive, brilliant response: '{last_ans}'. "
                f"MANDATORY INSTRUCTION: Begin your response with an enthusiastic remark like '{eval_remark}' or 'That's impressive!'. "
                f"Then, ask a deeper follow-up question that increases difficulty or explores complex edge cases/trade-offs in the same domain. "
                f"Keep total response concise (1-2 sentences)."
            )
            user_prompt = f"Candidate gave a brilliant answer: '{last_ans}'. Give remark and ask deeper edge-case follow-up."

        elif eval_state == "WRONG_MISCONCEPTION":
            system_prompt = (
                f"You are {speaker_name}, interviewing for {role}. "
                f"The candidate's answer ('{last_ans}') contains a technical misconception or flawed premise. "
                f"MANDATORY INSTRUCTION: Begin with an empathetic, moderate remark like '{eval_remark}' or 'I see where you are coming from, but keep in mind...'. "
                f"Politely explain the misconception in 1 short sentence, then ask how they would adjust their design to fix it. "
                f"Keep total response under 2 sentences."
            )
            user_prompt = f"Candidate answered with misconception: '{last_ans}'. Give moderate remark, correct gently, and ask to adjust."

        elif eval_state == "PAUSING_SEARCHING_WORDS":
            system_prompt = (
                f"You are {speaker_name}, interviewing for {role}. "
                f"The candidate is hesitating or searching for words ('{last_ans}'). "
                f"MANDATORY INSTRUCTION: Begin with a patient helper remark like '{eval_remark}' or 'Do you mean...?'. "
                f"Help predict what concept they are trying to articulate and ask them if that is what they mean. "
                f"Keep total response concise."
            )
            user_prompt = f"Candidate paused/searching for words: '{last_ans}'. Help predict what they mean."

        elif eval_state == "CLARIFICATION_NEEDED" and clarification_count <= 2:
            system_prompt = (
                f"You are {speaker_name}, interviewing for {role}. "
                f"The candidate asked for clarification/elaboration ('{last_ans}') on question: '{curr_q}'. "
                f"MANDATORY INSTRUCTION: DO NOT change the main topic. Begin with a clear remark like '{eval_remark}' or 'No worries! Let me simplify that question...'. "
                f"Reframe, simplify, or provide a real-world analogy for the EXACT SAME question. "
                f"Keep total response under 2 sentences."
            )
            user_prompt = f"Candidate asked for clarification (attempt {clarification_count}). Reframe the same question simply."

        elif eval_state == "CLARIFICATION_NEEDED" and clarification_count > 2:
            system_prompt = (
                f"You are {speaker_name}, interviewing for {role}. "
                f"The candidate requested clarification 3 times. "
                f"MANDATORY INSTRUCTION: Begin with a warm transition remark like 'That is completely fine, let us move on to our next area...'. "
                f"Pivot gracefully to a new topic and ask a fresh question."
            )
            user_prompt = f"Candidate requested clarification 3 times. Transition gracefully to a new topic."

        elif eval_state == "CANNOT_ANSWER_SKIP":
            system_prompt = (
                f"You are {speaker_name}, interviewing for {role}. "
                f"The candidate explicitly expressed difficulty or requested a skip ('{last_ans}'). "
                f"MANDATORY INSTRUCTION: Begin with a warm empathetic remark like '{eval_remark}' or 'No problem at all! Let us switch topics...'. "
                f"Pivot to a foundational question on a different topic. Keep total response concise."
            )
            user_prompt = f"Candidate skipped: '{last_ans}'. Give empathetic remark and pivot topic."

        else: # DECENT_GOOD / Standard
            system_prompt = (
                f"You are {speaker_name}, interviewing for {role}. Job Description: {jd[:250]}. "
                f"React naturally to the candidate's last answer. "
                f"MANDATORY INSTRUCTION: Begin your response with a short validating remark like '{eval_remark}' or 'Fair point' or 'Makes sense...'. "
                f"Then ask your next direct follow-up question. Keep total response under 2 sentences."
            )
            user_prompt = f"Candidate's last answer: '{last_ans}'. Give remark and ask next question."

        llm_q = call_llm(user_prompt, system_prompt)
        if llm_q:
            state["current_question"] = llm_q
            return state

    # Fallback / Mock Mode
    if eval_state == "BRILLIANT":
        prefix = "That's impressive! "
        q_raw = "Building on your strong response, how would you optimize this design under 100x traffic burst conditions?"
    elif eval_state == "WRONG_MISCONCEPTION":
        prefix = "I see where you're coming from, but keep in mind that primary databases can lock under heavy writes. "
        q_raw = "How would you adjust your read isolation strategy to prevent database locks?"
    elif eval_state == "PAUSING_SEARCHING_WORDS":
        prefix = "Take your time... do you mean separating read and write workloads into master-replica replicas? "
        q_raw = "Is that the pattern you were referring to?"
    elif eval_state == "CLARIFICATION_NEEDED" and clarification_count <= 2:
        prefix = "No worries! To simplify what I asked... "
        q_raw = f"How would you make sure your app stays fast when thousands of users join at once?"
    elif eval_state in ["CANNOT_ANSWER_SKIP", "CLARIFICATION_NEEDED"]:
        prefix = "That's completely fine! Let's move on to our next area... "
        q_raw = SYSTEM_ARCHITECT_QUESTIONS[(turn + 1) % len(SYSTEM_ARCHITECT_QUESTIONS)] if interviewer == "SYSTEM_ARCHITECT" else PRODUCT_MANAGER_QUESTIONS[(turn + 1) % len(PRODUCT_MANAGER_QUESTIONS)]
    else:
        prefix = f"{eval_remark} " if eval_remark else "Fair point... "
        q_raw = SYSTEM_ARCHITECT_QUESTIONS[turn % len(SYSTEM_ARCHITECT_QUESTIONS)] if interviewer == "SYSTEM_ARCHITECT" else PRODUCT_MANAGER_QUESTIONS[turn % len(PRODUCT_MANAGER_QUESTIONS)]

    state["current_question"] = f"{prefix}{q_raw}"
    return state


def build_response_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Assembles final transcript entry and turn count."""
    turn = state.get("turn_count", 0) + 1
    state["turn_count"] = turn
    return state


def run_interview_graph(state: Dict[str, Any]) -> Dict[str, Any]:
    """Runs state through Orchestrator, Analysis, Generation, and Response assembly nodes."""
    state = orchestrator_node(state)
    state = analyze_answer_node(state)
    state = generate_question_node(state)
    state = build_response_node(state)
    return state


def generate_assessment(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generates the final multi-agent evaluation report."""
    tech = state.get("tech_score", {})
    pm = state.get("pm_score", {})
    tech_depth = tech.get("depth", 7.0)
    pm_depth = pm.get("depth", 7.0)

    overall = round((tech_depth + pm_depth) / 2, 1)

    return {
        "candidate_role": state.get("role", "Software Engineer"),
        "total_turns": state.get("turn_count", 0),
        "overall_score": overall,
        "technical_score": tech_depth,
        "product_score": pm_depth,
        "technical_level": tech.get("estimated_level", "Mid Level"),
        "product_level": pm.get("estimated_level", "Mid Level"),
        "strengths": [
            "Demonstrated dynamic adaptability during panel cross-questioning.",
            "Handled system architecture trade-offs with clear rationale.",
            "Maintained strong engagement during continuous hands-free voice interaction."
        ],
        "growth_areas": [
            "Could deepen edge-case analysis under peak load conditions.",
            "Can refine quantitative metrics when proposing product trade-offs."
        ],
        "recommendation": "HIRE" if overall >= 7.0 else "CONSIDER",
        "detailed_feedback": f"The candidate achieved an overall panel evaluation score of {overall}/10 across System Architecture ({tech_depth}/10) and Product Strategy ({pm_depth}/10)."
    }
