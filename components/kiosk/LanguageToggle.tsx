"use client";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  onChange: (l: Locale) => void;
}

export function LanguageToggle({ locale, onChange }: Props) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={locale === "id" ? "default" : "outline"}
        onClick={() => onChange("id")}
      >
        ID
      </Button>
      <Button
        size="sm"
        variant={locale === "en" ? "default" : "outline"}
        onClick={() => onChange("en")}
      >
        EN
      </Button>
    </div>
  );
}
