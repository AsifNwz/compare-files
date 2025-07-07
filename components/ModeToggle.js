"use client";

import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ModeToggle() {
  const { setTheme } = useTheme();
  const [isDark, setIsDark] = useState(true);

  return (
    <>
      {isDark ? (
        <Button
          variant="outline"
          size="icon"
          className="bg-accent cursor-pointer border-0 outline-none"
          onClick={() => {
            setIsDark((prev) => !prev);
            setTheme("light");
          }}
        >
          <SunIcon className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      ) : (
        <Button
          variant="outline"
          className="bg-accent cursor-pointer border-0 outline-none"
          size="icon"
          onClick={() => {
            setIsDark((prev) => !prev);
            setTheme("dark");
          }}
        >
          <MoonIcon className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      )}
    </>
  );
}
