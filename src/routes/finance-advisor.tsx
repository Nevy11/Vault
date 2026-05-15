import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/finance-advisor")({
  head: () => ({
    meta: [
      { title: "Finance Advisor — Vault OS" },
      { name: "description", content: "Get instant finance guidance from your Vault AI advisor." },
    ],
  }),
  component: FinanceAdvisorPage,
});

const initialMessages = [
  {
    sender: "advisor",
    avatar: <MessageCircle className="h-4 w-4" />,
    text: "Hi Alex! I can help you improve your spending, save more, and grow your net worth. What would you like to do today?",
  },
  {
    sender: "user",
    text: "Help me plan my budget for next month.",
  },
  {
    sender: "advisor",
    avatar: <Sparkles className="h-4 w-4" />,
    text: "Great! Based on your current savings and expenses, I recommend allocating 50% to essentials, 30% to goals, and 20% to discretionary spending.",
  },
];

function Bubble({ sender, avatar, text }: { sender: string; avatar?: React.ReactNode; text: string }) {
  const isAdvisor = sender === "advisor";
  return (
    <div className={`flex ${isAdvisor ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
          isAdvisor ? "bg-card/70 text-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {isAdvisor && (
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              {avatar}
            </span>
            Finance Advisor
          </div>
        )}
        <p>{text}</p>
      </div>
    </div>
  );
}

function FinanceAdvisorPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsScrolledToBottom(distanceFromBottom < 32);
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    handleScroll();
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { sender: "user", text: trimmed },
      { sender: "advisor", avatar: <MessageCircle className="h-4 w-4" />, text: "Sorry, this feature has not yet been implemented." },
    ]);
    setDraft("");
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-0 pt-6 h-[calc(100vh-4rem)] overflow-hidden">
        <div className="mb-4 flex flex-col gap-4 px-5 md:px-0">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              <span className="hidden md:inline">Your </span>
              Finance Advisor
            </h1>
            <p className="mt-2 hidden text-sm text-muted-foreground sm:block">
              A chat-style advisor interface to preview how your financial conversation could look.
            </p>
          </div>
        </div>

        <div className="relative mx-4 overflow-hidden rounded-t-3xl border border-border/40 bg-background/80 shadow-sm md:mx-0 flex min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b border-border/40 px-5 py-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Secure advice, mock insights only
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-0"
          >
            <div className="space-y-4">
              {messages.map((message, index) => (
                <Bubble key={index} sender={message.sender} avatar={message.avatar} text={message.text} />
              ))}
            </div>
            <div ref={endRef} />
          </div>

          <button
            type="button"
            onClick={scrollToBottom}
            className={`absolute right-4 bottom-28 inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg transition-all duration-200 hover:bg-card ${
              isScrolledToBottom ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            Scroll to latest
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="fixed inset-x-0 bottom-16 z-60 px-5 py-4 md:fixed md:left-64 md:bottom-0 md:z-60 md:px-6 md:py-5"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-3xl border border-border/60 bg-card/95 px-4 py-3 shadow-lg md:px-5">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your message to the finance advisor..."
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" className="h-11 bg-primary px-4 text-primary-foreground hover:bg-primary/90">
              Send
            </Button>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
