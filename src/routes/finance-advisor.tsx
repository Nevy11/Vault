import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles, Shield, TrendingUp, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";
import { toast } from "sonner";

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
];

function MarkdownContent({ text }: { text: string }) {
  // Simple regex-based markdown parser for bold, headers, and lists
  const lines = text.split("\n");
  
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Headers (e.g., # Header)
        if (line.startsWith("#")) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const content = line.replace(/^#+\s*/, "");
          const className = level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-bold" : "text-sm font-bold";
          return <p key={i} className={className}>{content}</p>;
        }
        
        // Lists (e.g., * item or - item or 1. item)
        if (line.match(/^[\*\-\d\.]+\s/)) {
          const content = line.replace(/^[\*\-\d\.]+\s/, "");
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-primary">•</span>
              <span>{formatBold(content)}</span>
            </div>
          );
        }

        return <p key={i} className="min-h-[1em]">{formatBold(line)}</p>;
      })}
    </div>
  );
}

function formatBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-primary/90">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

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
        {isAdvisor ? <MarkdownContent text={text} /> : <p className="whitespace-pre-wrap">{text}</p>}
      </div>
    </div>
  );
}

function FinanceAdvisorPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [profile] = useProfileSignal();
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
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch chat history
        const { data: history, error: historyError } = await supabase
          .from("ai_chat_messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (historyError) throw historyError;

        if (history && history.length > 0) {
          setMessages(history.map(m => ({
            sender: m.sender,
            text: m.text,
            avatar: m.sender === "advisor" ? <Sparkles className="h-4 w-4" /> : undefined
          })));
        } else {
          // Default greeting if no history
          const greeting = `Hi ${profile?.first_name || "there"}! I can help you improve your spending, save more, and grow your net worth. What would you like to do today?`;
          setMessages([{
            sender: "advisor",
            avatar: <Sparkles className="h-4 w-4" />,
            text: greeting
          }]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  useEffect(() => {
    if (!isInitialLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading, isInitialLoading]);

  useEffect(() => {
    handleScroll();
  }, []);

  const speak = (text: string) => {
    if (!isSpeechEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Female") || v.lang === "en-US");
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isLoading) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to chat.");
      return;
    }

    const newUserMessage = { sender: "user", text: trimmed };
    setMessages((current) => [...current, newUserMessage]);
    setDraft("");
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase.from("ai_chat_messages").insert({
        user_id: user.id,
        sender: "user",
        text: trimmed
      });

      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: {
          messages: messages.map(m => ({ sender: m.sender, text: m.text })),
          userInput: trimmed
        },
      });

      if (error) throw error;

      const aiText = data.text;
      const newAiMessage = {
        sender: "advisor",
        avatar: <Sparkles className="h-4 w-4" />,
        text: aiText,
      };

      // Save AI response to database
      await supabase.from("ai_chat_messages").insert({
        user_id: user.id,
        sender: "advisor",
        text: aiText
      });

      setMessages((current) => [...current, newAiMessage]);
      speak(aiText);
    } catch (error: any) {
      console.error("Error calling Gemini:", error);
      toast.error("Failed to get response from advisor.");
      
      setMessages((current) => [
        ...current,
        {
          sender: "advisor",
          avatar: <Sparkles className="h-4 w-4" />,
          text: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading your advisor...</p>
          </div>
        </div>
      </AppShell>
    );
  }

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
                  Your personal AI-powered financial strategist, powered by Gemini.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => {
                    setIsSpeechEnabled(!isSpeechEnabled);
                    if (isSpeaking) window.speechSynthesis.cancel();
                  }}
                  title={isSpeechEnabled ? "Mute Advisor" : "Unmute Advisor"}
                >
                  {isSpeechEnabled ? (
                    <Volume2 className={`h-5 w-5 ${isSpeaking ? "text-primary animate-pulse" : ""}`} />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
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
            <Sparkles className="h-4 w-4 text-primary" />
            AI-Powered Intelligence
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
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] sm:max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-sm bg-card/70 text-foreground">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.2s]"></div>
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
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
                placeholder={isLoading ? "Advisor is thinking..." : "Ask me anything about your finances..."}
                disabled={isLoading}
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !draft.trim()}
                className="h-10 bg-primary px-4 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? "..." : "Send"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
