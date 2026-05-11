"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTranslations, type Locale } from "@/lib/i18n";
import { printTicketSerial, printTicketWindow } from "@/lib/printer";

interface Service {
  id: number;
  name: string;
  nameEn: string;
  prefix: string;
}

interface Props {
  services: Service[];
  locale: Locale;
}

type Step = "service" | "type" | "form" | "ticket";

interface TicketResult {
  formattedNumber: string;
  estimatedWait: number;
  service: Service;
  visitorName: string;
}

export function KioskForm({ services, locale }: Props) {
  const tr = getTranslations(locale);
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [queueType, setQueueType] = useState<"single" | "disability">("single");
  const [form, setForm] = useState({ visitorName: "", nik: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ticket, setTicket] = useState<TicketResult | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.visitorName.trim()) e.visitorName = tr.kiosk.validation.nameRequired;
    if (!form.nik.trim()) e.nik = tr.kiosk.validation.nikRequired;
    else if (form.nik.replace(/\D/g, "").length !== 16) e.nik = tr.kiosk.validation.nikLength;
    if (!form.phone.trim()) e.phone = tr.kiosk.validation.phoneRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedService) return;
    setLoading(true);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: form.visitorName,
          nik: form.nik,
          phone: form.phone,
          serviceId: selectedService.id,
          queueType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTicket({ ...data, service: selectedService, visitorName: form.visitorName });
        setStep("ticket");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!ticket) return;
    const ticketData = {
      officeName: "BPOM Lubuklinggau",
      formattedNumber: ticket.formattedNumber,
      serviceName: locale === "en" ? ticket.service.nameEn : ticket.service.name,
      visitorName: ticket.visitorName,
      estimatedWait: ticket.estimatedWait,
      createdAt: new Date(),
    };
    const printed = await printTicketSerial(ticketData);
    if (!printed) printTicketWindow(ticketData);
  };

  const reset = () => {
    setStep("service");
    setSelectedService(null);
    setQueueType("single");
    setForm({ visitorName: "", nik: "", phone: "" });
    setErrors({});
    setTicket(null);
  };

  if (step === "ticket" && ticket) {
    return (
      <Card className="w-full max-w-md mx-auto text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-green-600 text-2xl">✓ {tr.kiosk.yourNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-7xl font-black text-blue-700 py-4">{ticket.formattedNumber}</div>
          <p className="text-gray-600">
            {locale === "en" ? ticket.service.nameEn : ticket.service.name}
          </p>
          <p className="text-sm text-gray-500">
            {tr.common.estimatedWait}: ~{ticket.estimatedWait} {tr.common.minutes}
          </p>
          {queueType === "disability" && (
            <Badge className="bg-purple-600">{tr.common.disability}</Badge>
          )}
          <p className="text-gray-600 font-medium">{tr.kiosk.thankYou}</p>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={handlePrint} variant="outline">
              🖨️ {tr.kiosk.printTicket}
            </Button>
            <Button onClick={reset}>{tr.kiosk.takeAnother}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "service") {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-center">{tr.kiosk.selectService}</h2>
        <div className="grid grid-cols-1 gap-3">
          {services.map((s) => (
            <Button
              key={s.id}
              variant="outline"
              className="h-16 text-lg justify-start px-6"
              onClick={() => { setSelectedService(s); setStep("type"); }}
            >
              <span className="font-bold text-blue-700 mr-3 text-xl">{s.prefix}</span>
              {locale === "en" ? s.nameEn : s.name}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "type") {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-center">{tr.kiosk.queueType}</h2>
        <div className="grid grid-cols-1 gap-4">
          <Button
            variant={queueType === "single" ? "default" : "outline"}
            className="h-20 text-lg"
            onClick={() => setQueueType("single")}
          >
            👥 {tr.kiosk.singleQueue}
          </Button>
          <Button
            variant={queueType === "disability" ? "default" : "outline"}
            className="h-20 text-lg border-purple-400 text-purple-700"
            onClick={() => setQueueType("disability")}
          >
            ♿ {tr.kiosk.disabilityQueue}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("service")} className="flex-1">
            ← {tr.common.cancel}
          </Button>
          <Button onClick={() => setStep("form")} className="flex-1">
            {tr.kiosk.fillData} →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{tr.kiosk.fillData}</CardTitle>
        {selectedService && (
          <p className="text-sm text-gray-500">
            {locale === "en" ? selectedService.nameEn : selectedService.name}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>{tr.kiosk.name}</Label>
          <Input
            placeholder={tr.kiosk.namePlaceholder}
            value={form.visitorName}
            onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
            className={errors.visitorName ? "border-red-500" : ""}
          />
          {errors.visitorName && <p className="text-red-500 text-xs">{errors.visitorName}</p>}
        </div>
        <div className="space-y-1">
          <Label>{tr.kiosk.nik}</Label>
          <Input
            placeholder={tr.kiosk.nikPlaceholder}
            value={form.nik}
            maxLength={16}
            onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value.replace(/\D/g, "") }))}
            className={errors.nik ? "border-red-500" : ""}
          />
          {errors.nik && <p className="text-red-500 text-xs">{errors.nik}</p>}
        </div>
        <div className="space-y-1">
          <Label>{tr.kiosk.phone}</Label>
          <Input
            placeholder={tr.kiosk.phonePlaceholder}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setStep("type")} className="flex-1">
            ← {tr.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? tr.common.loading : tr.kiosk.getNumber}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
