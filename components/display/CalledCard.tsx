"use client";
import { Badge } from "@/components/ui/badge";

interface QueueItem {
  formattedNumber: string;
  counter?: { name: string } | null;
  service?: { name: string; nameEn: string } | null;
  queueType: string;
}

interface Props {
  item: QueueItem | null;
  label: string;
  locale: "id" | "en";
  large?: boolean;
  dimmed?: boolean;
}

export function CalledCard({ item, label, locale, large = false, dimmed = false }: Props) {
  if (!item) {
    return (
      <div className={`bg-white/10 rounded-2xl flex flex-col items-center justify-center p-6 ${large ? "min-h-48" : "min-h-32"}`}>
        <p className="text-white/40 text-lg">-</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl flex flex-col items-center justify-center p-6 shadow-lg transition-all ${large ? "min-h-48" : "min-h-32"} ${dimmed ? "bg-white/80" : "bg-white"}`}>
      <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-black ${large ? "text-7xl" : "text-4xl"} ${dimmed ? "text-blue-400" : "text-blue-700"}`}>
        {item.formattedNumber}
      </p>
      {item.counter && (
        <p className={`font-semibold ${large ? "text-xl mt-2" : "text-base mt-1"} ${dimmed ? "text-gray-400" : "text-gray-600"}`}>
          {item.counter.name}
        </p>
      )}
      {item.service && (
        <p className={`text-sm mt-1 ${dimmed ? "text-gray-300" : "text-gray-400"}`}>
          {locale === "en" ? item.service.nameEn : item.service.name}
        </p>
      )}
      {item.queueType === "disability" && (
        <Badge className="mt-2 bg-purple-600">♿ Prioritas</Badge>
      )}
      {dimmed && (
        <p className="text-xs text-gray-400 mt-2 italic">Selesai dilayani</p>
      )}
    </div>
  );
}
