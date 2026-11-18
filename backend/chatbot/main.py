"""MindAI chatbot service (FastAPI + Groq).

Run from backend/ (either works):
    uvicorn chatbot.main:app --port 5000
    python -m chatbot.main

Contract (used by controllers/chatController.js):
    POST /chat  {message: str, history: [{role, content}]}  ->  {reply: str}
    GET  /health[?deep=1]                                    ->  {status, model[, groq]}
"""
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel, field_validator

# backend/.env, resolved from this file so the working directory never matters
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH, override=True)

# Windows consoles default to cp1252; replies contain emoji/Urdu. Never crash on logging.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s: %(message)s")
logger = logging.getLogger("mindai")

DEFAULT_MODEL = "openai/gpt-oss-120b"
GROQ_MODEL = os.getenv("GROQ_MODEL") or DEFAULT_MODEL
LLM_TIMEOUT = float(os.getenv("CHATBOT_LLM_TIMEOUT", "45"))
MAX_HISTORY = 30

FALLBACK_REPLY = "I'm here for you. Could you tell me a little more about how you're feeling?"
BUSY_REPLY = "MindAI is a little busy right now. Please try again in a moment. 🌿"
DOWN_REPLY = "I'm having trouble connecting right now. Please try again shortly."

SYSTEM_PROMPT = """

You are "MindAI", a highly intelligent and compassionate mental health support assistant.

Your primary user base is from Pakistan, and you are a professional psychologist who is also a warm, trusted friend (dost).



# CORE IDENTITY:

- Your Name: MindAI

- Your Role: Professional Psychologist & Supportive Assistant

- Your Goal: To provide a safe, non-judgmental space for users to discuss their emotional wellbeing.



# PERSONA & TONE:

- **Professional but Warm:** You have deep psychological knowledge but explain complex concepts in simple, accessible terms.

- **Calm & Reassuring:** Your presence is calming. You validate the user's feelings.

- **Appropriate Humor:** You may use *light* humor (e.g., a "dad joke" or a gentle tease) ONLY when the user is in a lighthearted or neutral mood.

- **HUMOR GUARDRAIL (CRITICAL):** NEVER use humor if the user expresses sadness, anger, distress, or is discussing a serious topic. When in doubt, always choose compassion over humor.

- **Always Inquisitive:** Ask gentle, clarifying follow-up questions to understand the user's situation better. This is a key part of your "intelligent" and "professional" persona.

- **Always Friendly:** Be friendly and respectful to the user. Use Emojis to help user relive stress.

# LANGUAGE RULES (CRITICAL):

- You MUST respond in the *exact* language (e.g., English or Roman Urdu or Urdu) of the user's *last* message.

- If they write in Roman Urdu, you MUST write in Roman Urdu.

- If they write in Urdu, you MUST write in Urdu.

- If they write in English, you MUST write in English.



# CONVERSATION & DOMAIN LOGIC:

- **No Greetings:** Do not start a new conversation with "Hello" or "Assalam-o-Alaikum." Respond *directly* to the user's first message.

- **Strict Domain:** You ONLY discuss mental health, emotional wellbeing, and personal development.

- **Redirection:** If the user asks about non-mental-health topics (e.g., politics, news, weather, coding), you must politely decline and pivot back.

    - *Example (English):* "As MindAI, my expertise is in mental health and wellbeing. I'm not equipped to help with that, but I'm here to listen if you'd like to talk about what's on your mind."

    - *Example (Roman Urdu):* "MindAI ke taur par, main sirf zehni sehat aur emotional support ke liye hoon. Is silsilay mein main aapki behtar madad kar sakti hoon. Kya aap apne dil ya dimaagh ke baaray mein kuch baat karna chahenge?"

- **Use History:** Refer to the chat history to understand context and avoid asking repetitive questions.

- **Ending a Conversation:** If the user indicates they are leaving (e.g., "bye," "Allah Hafiz"), respond with a short, positive quote, a brief motivation, and end with "Allah Hafiz."



# CRISIS PROTOCOL (CRITICAL):

- If the user expresses thoughts of self-harm, suicide ("want to kill myself," "end my life," "jeenay ka dil nahi karta"), or is in severe, immediate distress:

    1.  **Acknowledge & Validate:** "I hear you, and it sounds like you are in a lot of pain. It's incredibly brave of you to share this."

    2.  **Refer Immediately:** Do NOT try to solve it yourself. Your *only* goal is to get them to professional help.

    3.  **Referral Script:** "Based on what you're saying, it's really important you speak to a professional right away. You can book an appointment directly with a qualified psychiatrist through the **MindAI Appointment system**. Please, reach out to them now."

    4.  **Provide Helplines:** "You can also contact these 24/7 Pakistani helplines: [Umang Pakistan: 0317-4288665], [Taskeen: 0317-111-8275]."



# INITIAL CONTEXT:

- The user has just started this session.

- {mood_context}

"""

# Plain string replace (not .format) so other braces in the prompt stay safe.
# Plain string replace (not .format / prompt templates) so other braces stay safe.
SYSTEM_PROMPT = SYSTEM_PROMPT.replace("{mood_context}", "")

USER_ROLES = {"user", "human"}
AI_ROLES = {"assistant", "bot", "ai", "model"}


# ---------- Request models (lenient on purpose: Node history can be messy) ----------
class HistoryItem(BaseModel):
    role: str = ""
    content: Optional[str] = None
    text: Optional[str] = None  # legacy field name

    @field_validator("role", mode="before")
    @classmethod
    def _role(cls, v: Any) -> str:
        return str(v or "").strip().lower()

    @field_validator("content", "text", mode="before")
    @classmethod
    def _text(cls, v: Any) -> Optional[str]:
        return None if v is None else str(v)


class ChatRequest(BaseModel):
    message: Optional[str] = None
    history: Optional[list[HistoryItem]] = None

    @field_validator("history", mode="before")
    @classmethod
    def _history(cls, v: Any):
        return v if isinstance(v, list) else []


class ChatResponse(BaseModel):
    reply: str


# ---------- Helpers ----------
def history_to_messages(history: Optional[list[HistoryItem]]) -> list[BaseMessage]:
    """Last MAX_HISTORY items; unknown roles and empty texts are skipped."""
    msgs: list[BaseMessage] = []
    for item in (history or [])[-MAX_HISTORY:]:
        content = (item.content or item.text or "").strip()
        if not content:
            continue
        if item.role in USER_ROLES:
            msgs.append(HumanMessage(content=content))
        elif item.role in AI_ROLES:
            msgs.append(AIMessage(content=content))
    return msgs


def extract_text(content: Any) -> str:
    """LLM content can be a str, a list of parts (str or {"type": "text", "text": ...}), or empty."""
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and part.get("type", "text") == "text":
                parts.append(str(part.get("text") or ""))
        text = "".join(parts)
    else:
        text = ""
    return text.strip() or FALLBACK_REPLY


def classify_error(exc: Exception) -> tuple[int, str]:
    """Map Groq/network errors to (HTTP status, short error type). No secrets leave here."""
    name = type(exc).__name__
    status = getattr(exc, "status_code", None)
    if name in {"RateLimitError"} or status == 429:
        return 503, "rate_limited"
    if name in {"APIConnectionError", "APITimeoutError", "TimeoutError", "ConnectError"}:
        return 503, "llm_unreachable"
    if name in {"AuthenticationError", "PermissionDeniedError"} or status in (401, 403):
        return 502, "llm_auth"
    if name in {"NotFoundError"} or status == 404:
        return 502, "llm_model_not_found"
    return 502, "llm_error"


def build_llm():
    from langchain_groq import ChatGroq  # imported lazily so tests can run without a key

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(f"GROQ_API_KEY is not set. Add it to {ENV_PATH}")
    return ChatGroq(
        model=GROQ_MODEL,
        api_key=api_key,
        temperature=0.7,
        timeout=LLM_TIMEOUT,
        max_retries=2,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    if getattr(app.state, "llm", None) is None:  # tests inject a fake LLM
        app.state.llm = build_llm()
    logger.info("MindAI chatbot ready (model: %s)", GROQ_MODEL)
    yield


app = FastAPI(title="MindAI Chatbot", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health(deep: int = 0):
    body: dict[str, Any] = {"status": "ok", "model": GROQ_MODEL}
    if deep:
        try:
            res = await app.state.llm.ainvoke([HumanMessage(content="Reply with: ok")])
            body["groq"] = "ok" if extract_text(res.content) else "empty"
        except Exception as exc:  # noqa: BLE001
            status, kind = classify_error(exc)
            logger.error("Deep health check failed: %s: %s", type(exc).__name__, exc)
            return JSONResponse(status_code=status, content={**body, "status": "degraded", "groq": kind})
    return body


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    message = (req.message or "").strip()
    if not message:
        return JSONResponse(status_code=400, content={"reply": "Message cannot be empty."})

    messages: list[BaseMessage] = [SystemMessage(content=SYSTEM_PROMPT)]
    messages.extend(history_to_messages(req.history))
    messages.append(HumanMessage(content=message))

    try:
        response = await app.state.llm.ainvoke(messages)
    except Exception as exc:  # noqa: BLE001
        status, kind = classify_error(exc)
        logger.error("LLM call failed (%s): %s: %s", kind, type(exc).__name__, exc)
        reply = BUSY_REPLY if status == 503 else DOWN_REPLY
        return JSONResponse(status_code=status, content={"reply": reply, "error": kind})

    return ChatResponse(reply=extract_text(response.content))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "chatbot.main:app",
        host=os.getenv("CHATBOT_HOST", "127.0.0.1"),
        port=int(os.getenv("CHATBOT_PORT", "5000")),
    )
