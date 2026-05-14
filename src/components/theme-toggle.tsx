import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow-400 transition-transform duration-300 rotate-0" />
      ) : (
        <Moon className="h-5 w-5 text-slate-600 transition-transform duration-300 rotate-0" />
      )}
    </Button>
  );
}
