import { useEffect, useRef, useState } from "react";
import { Sparkles, Shield, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";
import { toast } from "sonner";

const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

function cacheKeyForUser(userId: string) {
  return `finance-advisor-messages:${userId}`;
}

function loadCachedMessagesRaw(userId: string) {
  try {
    const raw = localStorage.getItem(cacheKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || (Date.now() - parsed.ts) > CACHE_TTL) return null;
    return parsed.messages || null;
  } catch (e) {
    console.error("Failed to load cached messages:", e);
    return null;
  }
}

function saveCachedMessagesRaw(userId: string, messages: Array<{ sender: string; text: string }>) {
  try {
    const payload = { ts: Date.now(), messages };
    localStorage.setItem(cacheKeyForUser(userId), JSON.stringify(payload));
  } catch (e) {
    console.error("Failed to save cached messages:", e);
  }
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("#")) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const content = line.replace(/^#+\s*/, "");
          const className = level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-bold" : "text-sm font-bold";
          return <p key={i} className={className}>{content}</p>;
        }
        
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
        className={`max-w-[90%] sm:max-w-[80%] rounded-[24px] px-4 py-3 text-sm shadow-sm ${
          isAdvisor ? "bg-white/10 text-foreground backdrop-blur-md border border-white/10" : "bg-primary text-primary-foreground"
        }`}
      >
        {isAdvisor && (
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground/80">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
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

export function FinanceAdvisorContent({ isModal = false }: { isModal?: boolean }) {
// ... existing state ...
  const [profile] = useProfileSignal();

  const initialCached = (typeof window !== "undefined" && profile?.id) ? loadCachedMessagesRaw(profile.id) : null;
  const defaultGreeting = `Hi ${profile?.first_name || "there"}! I can help you improve your spending, save more, and grow your net worth. What would you like to do today?`;
  
  const [messages, setMessages] = useState<any[]>(() => {
    if (initialCached && initialCached.length > 0) {
      return initialCached.map((m: any) => ({
        sender: m.sender,
        text: m.text,
        avatar: m.sender === "advisor" ? <Sparkles className="h-4 w-4" /> : undefined,
      }));
    }
    return [];
  });
  
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(initialCached ? false : true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const userId = profile?.id ?? null;

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
    if (!userId) return;

    const fetchData = async () => {
      try {
        const cached = loadCachedMessagesRaw(userId);
        if (cached && cached.length > 0) {
          setMessages(cached.map((m: any) => ({
            sender: m.sender,
            text: m.text,
            avatar: m.sender === "advisor" ? <Sparkles className="h-4 w-4" /> : undefined,
          })));
          setIsInitialLoading(false);
        }

        const { data: history, error: historyError } = await supabase
          .from("ai_chat_messages")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (historyError) throw historyError;

        const ordered = (history || []).slice().reverse();
        if (ordered && ordered.length > 0) {
          const mapped = ordered.map(m => ({
            sender: m.sender,
            text: m.text,
            avatar: m.sender === "advisor" ? <Sparkles className="h-4 w-4" /> : undefined,
          }));
          setMessages(mapped);
          saveCachedMessagesRaw(userId, mapped.map(({ sender, text }) => ({ sender, text })));
        } else if (!cached || cached.length === 0) {
          const greetingMsg = [{ sender: "advisor", avatar: <Sparkles className="h-4 w-4" />, text: defaultGreeting }];
          setMessages(greetingMsg);
          saveCachedMessagesRaw(userId, greetingMsg.map(({ sender, text }) => ({ sender, text })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Unable to load advisor data.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [userId, defaultGreeting]);

  useEffect(() => {
    if (!userId) return;
    saveCachedMessagesRaw(userId, messages.map(m => ({ sender: m.sender, text: m.text })));
  }, [messages, userId]);

  useEffect(() => {
    if (!isInitialLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading, isInitialLoading]);

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

    if (!userId) {
      toast.error("You must be logged in to chat.");
      return;
    }

    const newUserMessage = { sender: "user", text: trimmed };
    setMessages((current) => [...current, newUserMessage]);
    setDraft("");
    setIsLoading(true);

    try {
      await supabase.from("ai_chat_messages").insert({
        user_id: userId,
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

      await supabase.from("ai_chat_messages").insert({
        user_id: userId,
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
      <div className="flex h-full items-center justify-center py-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your advisor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isModal ? "h-full" : "h-full"}`}>
      <div className="flex-shrink-0 mb-4">
        <div className={`mx-auto w-full bg-white/5 border border-white/10 px-4 py-4 shadow-sm rounded-[24px] backdrop-blur-md`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
                Finance Advisor
              </h1>
              {!isModal && (
                <p className="mt-1 text-xs text-sm text-muted-foreground hidden md:block">
                  AI-powered financial strategist, powered by Gemini.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 hover:bg-white/10"
                onClick={() => {
                  setIsSpeechEnabled(!isSpeechEnabled);
                  if (isSpeaking) window.speechSynthesis.cancel();
                }}
              >
                {isSpeechEnabled ? (
                  <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-primary animate-pulse" : ""}`} />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 text-[10px] md:text-xs">
                <Shield className="h-3 w-3" />
                Secure
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-sm flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
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
                <div className="rounded-3xl px-4 py-3 text-sm shadow-sm bg-white/5 backdrop-blur-md text-foreground border border-white/10">
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
          className="flex-shrink-0 border-t border-white/10 bg-black/20 backdrop-blur-xl px-3 py-3"
        >
          <div className="mx-auto flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-4 py-2 shadow-sm focus-within:border-primary/50 transition-colors">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={isLoading ? "Advisor is thinking..." : "Ask me..."}
              disabled={isLoading}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !draft.trim()}
              className="h-9 rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "..." : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
