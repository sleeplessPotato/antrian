"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodayDate } from "@/lib/queue-utils";

interface Summary {
  totalServed: number;
  totalSkipped: number;
  totalWaiting: number;
  avgWaitMinutes: number;
}

export function StatsCard() {
  const [summary, setSummary] = useState<Summary | null>(null);

  const fetch_ = async () => {
    const res = await fetch(`/api/reports?date=${getTodayDate()}`);
    const data = await res.json();
    setSummary(data.summary);
  };

  useEffect(() => {
    fetch_();
    const t = setInterval(fetch_, 30000);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { label: "Dilayani", value: summary?.totalServed ?? 0, color: "text-green-600" },
    { label: "Menunggu", value: summary?.totalWaiting ?? 0, color: "text-blue-600" },
    { label: "Dilewati", value: summary?.totalSkipped ?? 0, color: "text-orange-500" },
    { label: "Rata-rata Tunggu", value: summary ? `${summary.avgWaitMinutes} mnt` : "-", color: "text-purple-600" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Statistik Hari Ini</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
