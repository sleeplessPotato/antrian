"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSocket } from "@/lib/socket-client";

interface Counter {
  id: number;
  name: string;
  code: string;
  isOpen: boolean;
  staff?: { id: number; name: string } | null;
}

export function CounterManagement() {
  const [counters, setCounters] = useState<Counter[]>([]);

  const fetchCounters = useCallback(async () => {
    const res = await fetch("/api/counters");
    setCounters(await res.json());
  }, []);

  useEffect(() => {
    fetchCounters();

    const socket = getSocket();
    socket.on("counter:status", (updated: Counter) => {
      setCounters((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
    });

    return () => { socket.off("counter:status"); };
  }, [fetchCounters]);

  const toggle = async (counter: Counter) => {
    await fetch("/api/counters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId: counter.id, isOpen: !counter.isOpen }),
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Kelola Loket</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {counters.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border-2 transition-colors ${
                c.isOpen ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{c.name}</h3>
                <Badge variant={c.isOpen ? "default" : "secondary"}>
                  {c.isOpen ? "Buka" : "Tutup"}
                </Badge>
              </div>
              {c.staff && (
                <p className="text-xs text-gray-500 mb-2">Petugas: {c.staff.name}</p>
              )}
              <Button
                size="sm"
                variant={c.isOpen ? "destructive" : "default"}
                onClick={() => toggle(c)}
                className="w-full"
              >
                {c.isOpen ? "Tutup Loket" : "Buka Loket"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
