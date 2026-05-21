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

function Bubble({
  sender,
  avatar,
  text,
}: {
  sender: string;
  avatar?: React.ReactNode;
  text: string;
}) {
  const isAdvisor = sender === "advisor";
  return (
    <div className={`flex ${isAdvisor ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[90%] sm:max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
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
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
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
      {
        sender: "advisor",
        avatar: <MessageCircle className="h-4 w-4" />,
        text: "Sorry, this feature has not yet been implemented.",
      },
    ]);
    setDraft("");
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 pt-0 md:pt-6 min-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 mb-2 md:mb-4 px-3 md:px-0 pb-0 md:pb-2">
          <div className="mx-auto w-full rounded-none md:rounded-2xl bg-card/95 border-b md:border border-border/30 px-4 md:px-6 py-3 md:py-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 md:gap-6 flex-wrap">
              <div>
                <h1 className="text-lg font-semibold tracking-tight md:text-3xl lg:text-4xl">
                  <span>Your </span>
                  Finance Advisor
                </h1>
                <p className="mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground hidden md:block">
                  A chat-style advisor interface to preview how your financial conversation could
                  look.
                </p>
              </div>
              <div className="flex items-center text-sm justify-end">
                <span className="inline-flex shrink-0 items-center gap-1.5 md:gap-2 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 md:px-3 py-1 shadow-sm text-xs md:text-sm">
                  <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                  Secure
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-0 md:mx-0 overflow-hidden rounded-none md:rounded-t-3xl border-t md:border border-border/40 bg-background/80 shadow-sm flex min-h-0 flex-1 flex-col">
          <div className="hidden md:flex flex-wrap items-center gap-3 border-b border-border/40 bg-background/80 px-5 py-3 text-xs uppercase tracking-[0.3em] text-muted-foreground flex-shrink-0">
            <Shield className="h-4 w-4 text-primary" />
            Secure advice, mock insights only
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 overflow-y-auto px-4 md:px-5 py-4 md:py-5"
          >
            <div className="space-y-4">
              {messages.map((message, index) => (
                <Bubble
                  key={index}
                  sender={message.sender}
                  avatar={message.avatar}
                  text={message.text}
                />
              ))}
            </div>
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-shrink-0 border-t border-border/40 bg-background/95 px-3 py-3 sm:px-5 sm:py-4"
          >
            <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-3xl border border-border/60 bg-card/95 px-4 py-2 md:py-3 shadow-sm md:px-5">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your message..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                size="sm"
                className="h-10 bg-primary px-4 text-primary-foreground hover:bg-primary/90"
              >
                Send
              </Button>
            </div>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
