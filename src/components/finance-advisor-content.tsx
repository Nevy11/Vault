import { useEffect, useRef, useState } from "react";
import { Sparkles, Shield, Volume2, VolumeX, Mic, MicOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/api/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

const languageMap: Record<string, string> = {
  en: "en-US",
  sw: "sw-KE",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
};

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

function saveCachedMessagesRaw(userId: string, messages: Array<{ sender: string; text: string; action?: any }>) {
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

        const listMatch = line.match(/^[\s\u00A0]*([*+-]|\d+\.)[\s\u00A0]+/);
        if (listMatch) {
          const content = line.replace(/^[\s\u00A0]*([*+-]|\d+\.)[\s\u00A0]+/, "");
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
  action,
  onSuggestionSelect,
  onActionAccept,
}: {
  sender: string;
  text: string;
  action?: any;
  onSuggestionSelect: (val: string) => void;
  onActionAccept?: (action: any) => void;
}) {
  const { t } = useTranslation();
  const isAdvisor = sender === "advisor";
  const [accepted, setAccepted] = useState(false);
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
                {t("advisor.title")}
              </span>
            </div>
          )}

          <div className="text-sm">
            {isAdvisor ? (
              <>
                <MarkdownContent text={text} />
                {action && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 transform -translate-y-4 translate-x-4">
                      <Sparkles className="w-16 h-16 text-emerald-500" />
                    </div>
                    <h4 className="text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-1 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Pending Action
                    </h4>
                    <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-3">
                      {action.action_type === "create_savings_goal" ? "Create Savings Goal: " : "Deposit to Savings: "}
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{action.goal_name}</span> for <span className="font-bold text-emerald-600 dark:text-emerald-400">{action.amount}</span>
                    </p>
                    <Button 
                      disabled={accepted}
                      onClick={() => {
                        setAccepted(true);
                        if (onActionAccept) onActionAccept(action);
                      }}
                      className={cn(
                        "w-full rounded-full font-semibold shadow-md transition-all duration-300",
                        accepted ? "bg-zinc-200 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-500" : "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-emerald-500/25"
                      )}
                    >
                      {accepted ? "Accepted" : "Accept Action"}
                    </Button>
                  </div>
                )}
              </>
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
  const { t, i18n } = useTranslation();
  const { profile } = useProfile();
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
      recognition.lang = languageMap[i18n.language] || "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        toast.error(t("advisor.error_mic") + event.error);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognitionRef.current = recognition;
    }
  }, [i18n.language, t]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        toast.error(t("advisor.error_speech_unsupported"));
        return;
      }
      recognitionRef.current.start();
    }
  };

  const defaultGreeting = t("advisor.greeting", { name: profile?.first_name || "there" });

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
              action: m.action,
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
          const mapped = ordered.map((m) => {
            let action = undefined;
            let text = m.text;
            if (text.includes("||ACTION:")) {
              const parts = text.split("||ACTION:");
              text = parts[0];
              try { action = JSON.parse(parts[1]); } catch(e) {}
            }
            return {
              sender: m.sender,
              text: text,
              action,
            };
          });

          setMessages(mapped);
          saveCachedMessagesRaw(
            userId,
            mapped.map(({ sender, text, action }) => ({ sender, text, action })),
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
            greetingMsg.map(({ sender, text }) => ({ sender, text, action: undefined })),
          );
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error(t("advisor.error_history"));
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [userId, defaultGreeting, t]);

  useEffect(() => {
    if (!userId) return;
    saveCachedMessagesRaw(
      userId,
      messages.map((m) => ({ sender: m.sender, text: m.text, action: m.action })),
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
    utterance.lang = languageMap[i18n.language] || "en-US";
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

      if (error) {
        let errorMessage = error.message;
        try {
          if (error.context && typeof error.context.json === "function") {
            const errorBody = await error.context.json();
            if (errorBody?.error) errorMessage = errorBody.error;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        throw new Error(errorMessage);
      }

      const aiText = data.text;
      const aiAction = data.action;
      const newAiMessage = {
        sender: "advisor",
        text: aiText,
        action: aiAction,
      };

      await supabase.from("ai_chat_messages").insert({
        user_id: userId,
        sender: "advisor",
        text: aiAction ? `${aiText}||ACTION:${JSON.stringify(aiAction)}` : aiText,
      });

      setMessages((current) => [...current, newAiMessage]);
      speak(aiText);
    } catch (error: any) {
      console.error("Error calling Gemini:", error);
      toast.error(t("advisor.error_response"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionAccept = async (action: any) => {
    try {
      if (action.action_type === "create_savings_goal") {
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const { error } = await supabase.from("savings_goals").insert({
          user_id: userId,
          title: action.goal_name,
          target_amount: action.amount,
          current_amount: 0,
          status: "active",
          start_date: today.toISOString().split('T')[0],
          deadline_date: nextYear.toISOString().split('T')[0]
        });
        if (error) throw error;
        toast.success(`Savings goal "${action.goal_name}" created!`);
        processSubmit(`I have accepted the action to create the savings goal "${action.goal_name}".`);
      } else if (action.action_type === "deposit_to_savings") {
        const { data: goal } = await supabase.from("savings_goals").select("*").eq("user_id", userId).eq("title", action.goal_name).single();
        if (goal) {
          const { error: goalErr } = await supabase.from("savings_goals").update({
            current_amount: goal.current_amount + action.amount
          }).eq("id", goal.id);
          if (goalErr) throw goalErr;
          
          const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", userId).single();
          if (wallet) {
            await supabase.from("wallets").update({ balance: wallet.balance - action.amount }).eq("id", wallet.id);
          }
          
          await supabase.from("savings_ledger").insert({
            goal_id: goal.id,
            user_id: userId,
            amount: action.amount,
            source: "wallet",
            type: "manual",
            running_total: goal.current_amount + action.amount
          });

          await supabase.from("transactions").insert({
            sender_id: userId,
            receiver_id: userId,
            amount: action.amount,
            type: "transfer",
            category: "Savings",
            status: "completed",
            description: `Deposit to ${action.goal_name}`
          });
          toast.success(`Deposited ${action.amount} to "${action.goal_name}"!`);
          processSubmit(`I have accepted the action to deposit ${action.amount} into "${action.goal_name}".`);
        } else {
          toast.error("Savings goal not found.");
        }
      }
    } catch (e: any) {
      toast.error("Failed to execute action: " + e.message);
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
            {t("advisor.consulting")}
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
                {t("advisor.title")}
              </h1>
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-widest mt-1">
                {t("advisor.status")}
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
                {t("advisor.secure")}
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
              action={message.action}
              onSuggestionSelect={processSubmit}
              onActionAccept={handleActionAccept}
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
            placeholder={isLoading ? t("advisor.thinking") : t("advisor.placeholder")}
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
                t("advisor.send")
              )}
            </Button>
          </div>
        </form>
        <p className="text-[10px] text-center text-zinc-400 mt-3 font-medium">
          {t("advisor.disclaimer")}
        </p>
      </div>
    </div>
  );
}
