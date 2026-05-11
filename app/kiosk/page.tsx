"use client";
import { useState, useEffect } from "react";
import { LanguageToggle } from "@/components/kiosk/LanguageToggle";
import { KioskForm } from "@/components/kiosk/KioskForm";
import type { Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";
import { format } from "date-fns";

interface Service {
  id: number;
  name: string;
  nameEn: string;
  prefix: string;
}

export default function KioskPage() {
  const [locale, setLocale] = useState<Locale>("id");
  const [services, setServices] = useState<Service[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const tr = getTranslations(locale);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex flex-col">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tr.common.appName}</h1>
          <p className="text-blue-200 text-sm">{tr.kiosk.welcomeSubtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LanguageToggle locale={locale} onChange={setLocale} />
          <span className="text-blue-100 text-sm" suppressHydrationWarning>
            {format(currentTime, "HH:mm:ss - dd/MM/yyyy")}
          </span>
        </div>
      </header>

      {/* Welcome */}
      <div className="text-center text-white py-6">
        <h2 className="text-3xl font-semibold">{tr.kiosk.welcome}</h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        <KioskForm services={services} locale={locale} />
      </main>

      {/* Footer */}
      <footer className="text-center text-blue-200 text-xs py-3">
        BPOM Lubuklinggau &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
