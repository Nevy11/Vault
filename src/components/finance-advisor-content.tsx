import { useEffect, useRef, useState } from "react";
import { Sparkles, Shield, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    if (!parsed || !parsed.ts || Date.now() - parsed.ts > CACHE_TTL) return null;
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

function formatBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-emerald-600 dark:text-emerald-400">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function MarkdownContent({ text }: { text: string }) {
  // Clean up common AI leakage patterns like "*What to say:*" or "Options:"
  const cleanText = text
    .replace(/\*.*What to say:.*\*/gi, "")
    .replace(/Options:.*$/gi, "")
    .replace(/\[.*?\]/g, "") // Remove bracketed options from the text flow
    .trim();

  const lines = cleanText.split("\n");

  return (
    <div className="space-y-3 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        if (line.startsWith("#")) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const content = line.replace(/^#+\s*/, "");
          const className =
            level === 1
              ? "text-xl font-bold text-foreground"
              : level === 2
                ? "text-lg font-bold text-foreground"
                : "text-base font-bold text-foreground";
          return (
            <h3 key={i} className={className}>
              {content}
            </h3>
          );
        }

        if (line.match(/^[*-\d.]+\s/)) {
          const content = line.replace(/^[*-\d.]+\s/, "");
          return (
            <div key={i} className="flex gap-3 pl-2 group">
              <span className="text-emerald-500 font-bold mt-1 scale-125 select-none">•</span>
              <span className="text-foreground/90">{formatBold(content)}</span>
            </div>
          );
        }

        return (
          <p key={i} className="text-foreground/90">
            {formatBold(line)}
          </p>
        );
      })}
    </div>
  );
}

function SuggestionChips({ text, onSelect }: { text: string; onSelect: (val: string) => void }) {
  // Extract patterns like [Option Name] from the text
  const options = text.match(/\[(.*?)\]/g)?.map((opt) => opt.slice(1, -1)) || [];

  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {options.map((option, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(option)}
          className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500 hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Bubble({
  sender,
  text,
  onSuggestionSelect,
}: {
  sender: string;
  text: string;
  onSuggestionSelect: (val: string) => void;
}) {
  const isAdvisor = sender === "advisor";
  return (
    <div className={`flex w-full ${isAdvisor ? "justify-start" : "justify-end"} mb-6`}>
      <div
        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isAdvisor ? "items-start" : "items-end"}`}
      >
        <div
          className={cn(
            "relative px-5 py-4 shadow-sm transition-all duration-300",
            isAdvisor
              ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-none text-foreground"
              : "bg-emerald-600 text-white rounded-2xl rounded-tr-none shadow-emerald-500/10",
          )}
        >
          {isAdvisor && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Vault Advisor
              </span>
            </div>
          )}

          <div className="text-sm">
            {isAdvisor ? (
              <MarkdownContent text={text} />
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
            )}
          </div>
        </div>

        {isAdvisor && <SuggestionChips text={text} onSelect={onSuggestionSelect} />}
      </div>
    </div>
  );
}

export function FinanceAdvisorContent({ isModal = false }: { isModal?: boolean }) {
  const [profile] = useProfileSignal();
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const userId = profile?.id ?? null;

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        toast.error("Microphone error: " + event.error);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        toast.error("Speech recognition is not supported in this browser.");
        return;
      }
      recognitionRef.current.start();
    }
  };

  const defaultGreeting = `Hi ${profile?.first_name || "there"}! I'm your Vault Finance Advisor. I can help you analyze spending, optimize savings, or plan your next big investment. [Analyze my spending] [How can I save more?] [Current interest rates]`;

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
          setMessages(
            cached.map((m: any) => ({
              sender: m.sender,
              text: m.text,
            })),
          );
          setIsInitialLoading(false);
        }

        const { data: history, error: historyError } = await supabase
          .from("ai_chat_messages")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (historyError) throw historyError;

        if (history && history.length > 0) {
          const ordered = history.slice().reverse();
          const mapped = ordered.map((m) => ({
            sender: m.sender,
            text: m.text,
          }));

          setMessages(mapped);
          saveCachedMessagesRaw(
            userId,
            mapped.map(({ sender, text }) => ({ sender, text })),
          );
        } else if (!cached || cached.length === 0) {
          const greetingMsg = [
            {
              sender: "advisor",
              text: defaultGreeting,
            },
          ];
          setMessages(greetingMsg);
          saveCachedMessagesRaw(
            userId,
            greetingMsg.map(({ sender, text }) => ({ sender, text })),
          );
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Unable to load advisor history.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [userId, defaultGreeting]);

  useEffect(() => {
    if (!userId) return;
    saveCachedMessagesRaw(
      userId,
      messages.map((m) => ({ sender: m.sender, text: m.text })),
    );
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
    window.speechSynthesis.speak(utterance);
  };

  const processSubmit = async (text: string) => {
    const trimmed = text.trim();
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
        text: trimmed,
      });

      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: {
          messages: messages.map((m) => ({ sender: m.sender, text: m.text })),
          userInput: trimmed,
        },
      });

      if (error) throw error;

      const aiText = data.text;
      const newAiMessage = {
        sender: "advisor",
        text: aiText,
      };

      await supabase.from("ai_chat_messages").insert({
        user_id: userId,
        sender: "advisor",
        text: aiText,
      });

      setMessages((current) => [...current, newAiMessage]);
      speak(aiText);
    } catch (error: any) {
      console.error("Error calling Gemini:", error);
      toast.error("Failed to get response from advisor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    processSubmit(draft);
  };

  if (isInitialLoading) {
    return (
      <div className="flex h-full items-center justify-center py-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Consulting Vault AI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-black overflow-hidden">
      {/* Refined Header */}
      <div className="flex-shrink-0 px-4 py-4 sm:px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-none">
                Finance Advisor
              </h1>
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-widest mt-1">
                Active strategist
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => {
                setIsSpeechEnabled(!isSpeechEnabled);
                if (isSpeaking) window.speechSynthesis.cancel();
              }}
            >
              {isSpeechEnabled ? (
                <Volume2
                  className={`h-5 w-5 ${isSpeaking ? "text-emerald-500 animate-pulse" : "text-zinc-400"}`}
                />
              ) : (
                <VolumeX className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
              )}
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">
                Secure
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <div className="max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <Bubble
              key={index}
              sender={message.sender}
              text={message.text}
              onSuggestionSelect={processSubmit}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-none px-6 py-4 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 px-4 py-4 sm:px-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative group">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isLoading ? "Advisor is thinking..." : "Ask me anything..."}
            disabled={isLoading}
            className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] py-4 pl-6 pr-24 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-zinc-400"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleListening}
              disabled={isLoading}
              className={cn(
                "rounded-full h-10 w-10 transition-all",
                isListening
                  ? "bg-red-500/10 text-red-500 animate-pulse"
                  : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              )}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !draft.trim()}
              className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-5 font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-30"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </form>
        <p className="text-[10px] text-center text-zinc-400 mt-3 font-medium">
          Vault AI can make mistakes. Check important financial info.
        </p>
      </div>
    </div>
  );
}
