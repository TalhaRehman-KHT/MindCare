import {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppContext } from "../../context/AppContext";
import { assets } from "../assets/assets";
import { ASSISTANT_NAME } from "../config.js";
import Spinner, { PageLoader } from "../components/Spinner.jsx";
import { Avatar, Button, IconArrowRight, IconMenu, IconPlus, IconSend, IconTrash, IconX, Modal } from "../components/ui";

/* =========================
   Utility Functions
========================= */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

// Greeting based on the user's local time
const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Hello";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const SUGGESTIONS = [
  { emoji: "😰", text: "I'm feeling very anxious today" },
  { emoji: "💤", text: "I'm having trouble sleeping" },
  { emoji: "🎯", text: "Help me focus on my studies" },
  { emoji: "🧘", text: "Guide me through a breathing exercise" },
];

/* =========================
   ChatBot Component
========================= */
export default function ChatBot() {
  const { backendUrl, token, userData } = useContext(AppContext);
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  // conversation id we just created by sending a message: its messages are already on screen
  const justCreatedChatRef = useRef(null);

  /* -------- State -------- */
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // conversation awaiting confirmation
  const [deleting, setDeleting] = useState(false);
  // closed by default on small screens
  const [showSidebar, setShowSidebar] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768,
  );

  /* -------- Auth Guard -------- */
  useEffect(() => {
    if (!token) {
      toast.warning("Please sign in to continue");
      navigate("/login");
    }
  }, [token, navigate]);

  /* -------- Never show one account's chats to the next (logout / account switch) -------- */
  useEffect(() => {
    setConversations([]);
    setActiveChatId(null);
    setMessages([]);
    setDeleteTarget(null);
    setConversationsLoading(true);
    justCreatedChatRef.current = null;
  }, [token]);

  /* -------- Fetch Conversations -------- */
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/chat/conversations`, {
        headers: { token },
      });
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to load conversations", error);
    } finally {
      setConversationsLoading(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  /* -------- Fetch Messages -------- */
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    if (justCreatedChatRef.current === activeChatId) {
      justCreatedChatRef.current = null;
      return;
    }
    let cancelled = false;
    const fetchMessages = async () => {
      setMessages([]);
      setMessagesLoading(true);
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/chat/${activeChatId}`,
          { headers: { token } },
        );
        if (!cancelled && data.success) {
          setMessages(
            data.messages.map((msg) => ({
              id: msg._id,
              text: msg.content,
              sender: msg.role === "model" ? "bot" : "user",
            })),
          );
        }
      } catch (error) {
        if (cancelled) return;
        if (error.response?.status === 404 || error.response?.status === 400) {
          // not ours (or gone): drop it and start fresh
          setConversations((list) => list.filter((c) => c._id !== activeChatId));
          setActiveChatId(null);
          toast.error("Conversation not found");
        } else toast.error("Unable to load chat history");
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };
    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [activeChatId, backendUrl, token]);

  /* -------- Auto Scroll -------- */
  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  /* -------- Resize Textarea -------- */
  const handleInputResize = (e) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 176)}px`;
  };

  /* -------- Send Message -------- */
  const handleSend = useCallback(
    async (textOverride = null) => {
      const textToSend = textOverride || inputValue.trim();
      if (!textToSend || isLoading || messagesLoading) return;

      const userMessage = {
        id: Date.now(),
        text: textToSend,
        sender: "user",
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsLoading(true);

      try {
        const { data } = await axios.post(
          `${backendUrl}/api/chat`,
          { message: userMessage.text, conversationId: activeChatId },
          { headers: { token } },
        );

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: data.reply,
            sender: "bot",
          },
        ]);

        if (data.isNew) {
          justCreatedChatRef.current = data.conversationId;
          setActiveChatId(data.conversationId);
          fetchConversations();
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "I’m having trouble connecting to the server. Please check your connection.",
            sender: "bot",
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputValue,
      isLoading,
      messagesLoading,
      backendUrl,
      token,
      activeChatId,
      fetchConversations,
    ],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  /* -------- Delete Conversation (optimistic, rolled back on failure) -------- */
  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target || deleting) return;
    setDeleting(true);
    const snapshot = conversations;
    const wasActive = activeChatId === target._id;
    setConversations((list) => list.filter((c) => c._id !== target._id));
    if (wasActive) handleNewChat();
    try {
      const { data } = await axios.delete(`${backendUrl}/api/chat/${target._id}`, { headers: { token } });
      if (!data.success) throw new Error(data.message);
      toast.success("Conversation deleted");
      setDeleteTarget(null);
    } catch (error) {
      if (error.response?.status === 404) {
        // already gone server-side: keep it removed
        setDeleteTarget(null);
        return;
      }
      setConversations(snapshot);
      if (wasActive) setActiveChatId(target._id);
      toast.error(error.response?.data?.message || "Could not delete conversation");
    } finally {
      setDeleting(false);
    }
  };

  const closeOnMobile = () => {
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  /* =========================
     Sub-Components
  ========================= */
  const TypingIndicator = () => (
    <div className="anim-fade-up flex w-full justify-start" aria-live="polite">
      <div className="flex max-w-[85%] items-start gap-3">
        <img src={assets.logo} alt="" width="36" height="36" className="size-9 shrink-0 rounded-full" />
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3.5 shadow-xs">
          <div className="flex h-full items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full bg-accent-500"
                style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite var(--ease-in-out-soft)` }}
              />
            ))}
            <span className="ml-2 text-xs text-ink-subtle">{ASSISTANT_NAME} is typing…</span>
          </div>
        </div>
      </div>
    </div>
  );

  const markdown = (isUser) => ({
    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ node, ...props }) => <ul className="mb-2 ml-4 list-outside list-disc space-y-1" {...props} />,
    ol: ({ node, ...props }) => <ol className="mb-2 ml-4 list-outside list-decimal space-y-1" {...props} />,
    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
    strong: ({ node, ...props }) => <span className="font-semibold" {...props} />,
    a: ({ node, ...props }) => (
      <a className="underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    h1: ({ node, ...props }) => <h1 className={`mb-2 text-lg font-bold ${isUser ? "text-white!" : ""}`} {...props} />,
    h2: ({ node, ...props }) => <h2 className={`mb-2 text-base font-bold ${isUser ? "text-white!" : ""}`} {...props} />,
    code: ({ node, inline, className, children, ...props }) =>
      inline ? (
        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-sm" {...props}>
          {children}
        </code>
      ) : (
        <div className="my-2 overflow-x-auto rounded-lg bg-black/80 p-3 font-mono text-sm text-white">{children}</div>
      ),
  });

  const activeTitle = activeChatId
    ? conversations.find((c) => c._id === activeChatId)?.title || "Chat"
    : "New Session";

  /* =========================
     Render
  ========================= */
  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-(--z-drawer) bg-black/40 transition-opacity duration-300 md:hidden ${
          showSidebar ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* Sidebar: drawer on mobile, collapsible column on desktop */}
      <aside
        aria-label="Conversations"
        inert={!showSidebar}
        className={`fixed inset-y-0 left-0 z-(--z-drawer) flex w-[min(18rem,86vw)] flex-col border-r border-line bg-surface-2 pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out-soft md:static md:z-auto md:w-72 md:transition-none ${
          showSidebar ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-2 p-4">
          <button type="button" onClick={() => navigate("/")} className="flex min-h-11 items-center gap-2.5" aria-label="Back to home">
            <img src={assets.logo} alt="" width="36" height="36" className="size-9 rounded-full" />
            <span className="font-display font-bold">{ASSISTANT_NAME}</span>
          </button>
          <button type="button" onClick={() => setShowSidebar(false)} className="btn btn-ghost btn-icon md:hidden" aria-label="Close sidebar">
            <IconX />
          </button>
        </div>

        <div className="px-4 pb-3">
          <button type="button" onClick={handleNewChat} className="btn btn-primary btn-block">
            <IconPlus size={18} /> New Session
          </button>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto px-3 pb-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Recent conversations</p>
          <div className="space-y-1">
            {conversationsLoading && (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-ink-subtle">
                <Spinner size="sm" />
                Loading conversations...
              </div>
            )}
            {!conversationsLoading && conversations.length === 0 && (
              <p className="px-2 py-3 text-xs text-ink-subtle">No conversations yet.</p>
            )}
            {conversations.map((chat) => (
              <div
                key={chat._id}
                className={`group relative flex items-stretch rounded-xl transition-colors duration-150 ${
                  activeChatId === chat._id ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:bg-surface/70 hover:text-ink"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveChatId(chat._id);
                    closeOnMobile();
                  }}
                  aria-current={activeChatId === chat._id || undefined}
                  className="flex min-h-11 min-w-0 flex-1 flex-col gap-0.5 rounded-xl py-2.5 pl-3 pr-1 text-left"
                >
                  <span className="w-full truncate text-small font-medium">{chat.title || "Untitled Conversation"}</span>
                  <span className="text-[11px] text-ink-subtle">{formatDate(chat.updatedAt)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(chat)}
                  aria-label={`Delete conversation: ${chat.title || "Untitled Conversation"}`}
                  className="grid w-10 shrink-0 place-items-center rounded-xl text-ink-subtle transition-opacity hover:text-danger-strong focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-small text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <Avatar src={userData?.img} name={userData?.name || "You"} size={32} />
            <span className="flex-1 truncate text-left font-medium">Back to MindCare</span>
            <IconArrowRight size={16} />
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        <header className="surface-glass sticky top-0 z-(--z-raised) flex h-16 shrink-0 items-center gap-3 border-b border-line px-3 pt-[env(safe-area-inset-top)] sm:px-5">
          <button
            type="button"
            onClick={() => setShowSidebar(!showSidebar)}
            className="btn btn-ghost btn-icon"
            aria-label={showSidebar ? "Hide conversations" : "Show conversations"}
            aria-expanded={showSidebar}
          >
            <IconMenu />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{activeTitle}</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="text-xs font-medium text-ink-subtle">Online &amp; Secure</span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div ref={chatContainerRef} className="thin-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 md:py-8">
            {messagesLoading ? (
              <PageLoader text="Loading conversation..." className="flex-1" />
            ) : messages.length === 0 && !isLoading ? (
              <div className="anim-fade-up my-auto flex flex-col items-center py-6 text-center">
                <img src={assets.logo} alt="" width="88" height="88" className="anim-float mb-6 size-22 rounded-full shadow-md" />
                <h2 className="text-h1 font-bold">
                  {greeting()}
                  {userData?.name ? `, ${userData.name.split(" ")[0]}` : ""}
                </h2>
                <p className="mb-8 mt-2 max-w-md text-ink-muted">
                  I am {ASSISTANT_NAME}. I&apos;m here to listen, support, and help you find clarity. How are you feeling today?
                </p>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTIONS.map(({ emoji, text }, i) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => handleSend(text)}
                      disabled={isLoading}
                      style={{ animationDelay: `${120 + i * 60}ms` }}
                      className="card card-hover anim-fade-up group flex min-h-14 items-center gap-3 p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="text-xl transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
                        {emoji}
                      </span>
                      <span className="text-small font-medium text-ink-muted group-hover:text-ink">{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div key={msg.id} className={`anim-fade-up flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`flex max-w-[92%] gap-3 sm:max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        {isUser ? (
                          <Avatar src={userData?.img} name={userData?.name || "You"} size={36} className="hidden sm:inline-grid" />
                        ) : (
                          <img src={assets.logo} alt="" width="36" height="36" className="size-9 shrink-0 rounded-full" />
                        )}
                        <div
                          className={`min-w-0 overflow-hidden px-4 py-3 text-[15px] leading-relaxed shadow-xs ${
                            msg.isError
                              ? "rounded-2xl rounded-tl-md border border-danger-strong/20 bg-danger-soft text-danger-strong"
                              : isUser
                                ? "rounded-2xl rounded-tr-md bg-brand text-brand-ink"
                                : "rounded-2xl rounded-tl-md border border-line bg-surface text-ink"
                          }`}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdown(isUser)}>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoading && <TypingIndicator />}
              </>
            )}
          </div>
        </div>

        {/* Sticky composer */}
        <div className="shrink-0 border-t border-line/60 bg-bg/85 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-3xl border border-line-strong bg-surface p-1.5 shadow-md transition-shadow duration-200 focus-within:border-brand focus-within:shadow-(--shadow-ring)">
              <label htmlFor="chat-input" className="sr-only">
                Message {ASSISTANT_NAME}
              </label>
              <textarea
                id="chat-input"
                ref={textareaRef}
                rows="1"
                className="max-h-44 min-h-11 w-full resize-none border-none bg-transparent px-3.5 py-2.5 text-base text-ink placeholder:text-ink-subtle focus:outline-none"
                placeholder="Type your message here..."
                value={inputValue}
                onChange={handleInputResize}
                onKeyDown={handleKeyDown}
                disabled={isLoading || messagesLoading}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading || messagesLoading}
                aria-label="Send message"
                className="btn btn-primary btn-icon shrink-0"
              >
                {isLoading ? <Spinner size="sm" /> : <IconSend size={18} />}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-subtle">
              {ASSISTANT_NAME} can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </main>

      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete conversation?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Delete <span className="font-semibold text-ink">“{deleteTarget?.title || "Untitled Conversation"}”</span>? This can't be undone.
        </p>
      </Modal>
    </div>
  );
}
