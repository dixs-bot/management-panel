import { useEffect } from "react";
import { useUIStore } from "@/store/ui";

export function useTheme() {
  const { theme, toggleTheme, setTheme } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  return { theme, toggleTheme, setTheme };
}