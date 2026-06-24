import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeFade } from "@/hooks/useThemeFade";

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useThemeFade();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="สลับโหมดสี"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
};
