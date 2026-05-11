"use client";
import { useEffect, useRef, useState } from "react";

interface Announcement {
  id: number;
  text: string;
  textEn: string;
}

interface Props {
  announcements: Announcement[];
  locale: "id" | "en";
}

export function RunningText({ announcements, locale }: Props) {
  const texts = announcements.map((a) => (locale === "en" ? a.textEn : a.text));
  const [index, setIndex] = useState(0);
  const text = texts[index] ?? "";

  useEffect(() => {
    if (texts.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % texts.length), 8000);
    return () => clearInterval(t);
  }, [texts.length]);

  if (!text) return null;

  return (
    <div className="bg-yellow-400 text-black overflow-hidden h-10 flex items-center">
      <div className="animate-marquee whitespace-nowrap text-sm font-medium px-4">
        📢 {text}
      </div>
    </div>
  );
}
