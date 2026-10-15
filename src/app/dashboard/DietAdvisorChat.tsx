"use client";

import { useEffect, useRef, useState } from "react";
import Notice from "@/app/Notice";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const STARTER_QUESTIONS = [
  "Am I getting enough protein today?",
  "What should I eat for dinner to hit my protein target?",
  "Is my diet balanced for weight loss?",
];

export default function DietAdvisorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setIsSending(true);

    try {
      const res = await fetch("/api/diet-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch {
      setError("Couldn't reach the advisor. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close diet advisor chat" : "Ask about your diet"}
        className="fixed z-30 bottom-20 right-4 sm:bottom-6 sm:right-6 h-14 w-14 rounded-full bg-primary text-background shadow-card flex items-center justify-center text-2xl hover:opacity-90 active:scale-95 transition-all"
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div
          className="fixed z-30 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-[104px] sm:right-6 w-full sm:w-[380px] h-[75vh] sm:h-[560px] max-h-[75vh] bg-surface border border-border shadow-card rounded-t-[20px] sm:rounded-[20px] flex flex-col overflow-hidden animate-chat-in"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div>
              <p className="font-heading text-base font-semibold">Diet Advisor</p>
              <p className="text-xs text-muted">Grounded in Indian nutrition guidance</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="h-7 w-7 rounded-full text-muted hover:bg-primary-soft hover:text-primary-ink flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted px-1">Ask me anything about your diet — a few ideas:</p>
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendQuestion(q)}
                    className="text-left text-sm rounded-xl border border-border bg-background px-4 py-3 hover:border-primary/40 hover:bg-primary-soft/40 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-background rounded-br-sm"
                      : "bg-background border border-border rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted animate-typing-dot [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted animate-typing-dot [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted animate-typing-dot [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {error && <Notice tone="error">{error}</Notice>}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your diet..."
              disabled={isSending}
              className="input flex-1 text-sm h-10"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="h-10 w-10 shrink-0 rounded-full bg-primary text-background flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
