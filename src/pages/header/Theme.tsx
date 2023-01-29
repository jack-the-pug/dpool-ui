import { useCallback, useState } from "react";
import { MaterialSymbolsDarkMode, MaterialSymbolsSunnyRounded } from "../../components/icon";

export function Theme() {
  const [currentTheme, setCurrentTheme] = useState<string>(localStorage.theme)
  const setTheme = useCallback((theme: string) => {
    setCurrentTheme(theme)
    localStorage.theme = theme
    theme === "dark" ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  }, [])
  return <div className="flex items-center">
    {currentTheme === "dark" ? <MaterialSymbolsDarkMode className="w-6 h-6" onClick={() => setTheme("light")} /> : <MaterialSymbolsSunnyRounded className="w-6 h-6" onClick={() => setTheme("dark")} />}
  </div>
}