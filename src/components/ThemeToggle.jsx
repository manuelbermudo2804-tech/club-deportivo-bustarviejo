import React, { useState, useEffect } from "react";
import { Moon, Sun, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("auto");

  useEffect(() => {
    // Por defecto usar "light" (modo claro)
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (selectedTheme) => {
    const body = document.body;
    const root = document.documentElement;
    
    // Añadir transición suave
    body.style.transition = "background 0.3s ease, color 0.3s ease";
    
    if (selectedTheme === "auto") {
      // Use system preference (prefers-color-scheme) for Android/iOS integration
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      
      if (prefersDark) {
        root.classList.add("dark");
        body.classList.remove("theme-light");
        body.classList.add("theme-dark");
      } else {
        root.classList.remove("dark");
        body.classList.remove("theme-dark");
        body.classList.add("theme-light");
      }
    } else if (selectedTheme === "dark") {
      root.classList.add("dark");
      body.classList.remove("theme-light");
      body.classList.add("theme-dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("theme-dark");
      body.classList.add("theme-light");
    }
    
    // Remover transición después
    setTimeout(() => {
      body.style.transition = "";
    }, 300);
  };

  // Listen for system theme changes when in "auto" mode
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const getIcon = () => {
    if (theme === "dark") return <Moon className="w-5 h-5 text-blue-400" />;
    if (theme === "light") return <Sun className="w-5 h-5 text-yellow-500" />;
    return <Clock className="w-5 h-5 text-purple-500" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full min-w-[44px] min-h-[44px] transition-all hover:scale-110"
        >
          {getIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => changeTheme("light")} className="cursor-pointer">
          <Sun className="w-4 h-4 mr-2 text-yellow-500" />
          Claro
          {theme === "light" && <span className="ml-auto text-green-500">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("dark")} className="cursor-pointer">
          <Moon className="w-4 h-4 mr-2 text-blue-400" />
          Oscuro
          {theme === "dark" && <span className="ml-auto text-green-500">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("auto")} className="cursor-pointer">
          <Clock className="w-4 h-4 mr-2 text-purple-500" />
          Automático
          {theme === "auto" && <span className="ml-auto text-green-500">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}