import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles, Shield, TrendingUp, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
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
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function FinanceAdvisorPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
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
  }, [messages, isLoading]);

  useEffect(() => {
    handleScroll();
  }, []);

  const speak = (text: string) => {
    if (!isSpeechEnabled) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    // Try to find a nice female voice or a clear voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Female") || v.lang === "en-US");
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isLoading) return;

    const newUserMessage = { sender: "user", text: trimmed };
    setMessages((current) => [...current, newUserMessage]);
    setDraft("");
    setIsLoading(true);

    try {
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

      setMessages((current) => [...current, newAiMessage]);
      speak(aiText);
    } catch (error: any) {
      console.error("Error calling Gemini:", error);
      toast.error("Failed to get response from advisor: " + error.message);
      
      setMessages((current) => [
        ...current,
        {
          sender: "advisor",
          avatar: <MessageCircle className="h-4 w-4" />,
          text: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
