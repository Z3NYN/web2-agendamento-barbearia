import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Campo } from "./Interface";
import { hoje } from "../services/formato";

export function somarDias(iso: string, dias: number) {
  const data = new Date(iso + "T12:00:00Z");
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}
const mes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const completa = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" });
const utc = (s: string) => new Date(s + "T12:00:00Z");

export default function Semana({ dia, escolher }: { dia: string; escolher: (dia: string) => void }) {
  const menor = hoje();
  const maior = somarDias(menor, 90);
  const [inicio, setInicio] = useState(dia >= menor && dia <= maior ? dia : menor);
  useEffect(() => {
    setInicio(anterior => dia < anterior || dia > somarDias(anterior, 6) ? dia : anterior);
  }, [dia]);
  const [calendario, setCalendario] = useState(false);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  return <div className="week-picker">
    <div className="week-top">
      <button type="button" className="icon-btn" aria-label="Semana anterior" disabled={inicio <= menor}
        onClick={() => setInicio([somarDias(inicio, -7), menor].sort()[1])}><ChevronLeft size={20} /></button>
      <strong aria-live="polite">{mes.format(utc(inicio))}</strong>
      <button type="button" className="icon-btn" aria-label="Próxima semana" disabled={dias[6] >= maior}
        onClick={() => setInicio(somarDias(inicio, 7))}><ChevronRight size={20} /></button>
    </div>
    <div className="week-days" key={inicio}>{dias.map(d => <button key={d} type="button" disabled={d > maior}
      aria-label={completa.format(utc(d))} aria-pressed={d === dia} onClick={() => escolher(d)}>
      <small>{semana.format(utc(d)).replace(".", "")}</small><strong>{d.slice(8)}</strong></button>)}</div>
    <button type="button" className="studio-text-link" aria-expanded={calendario} onClick={() => setCalendario(v => !v)}>
      <CalendarDays size={17} /> Calendário mensal</button>
    {calendario && <Campo nome="Data"><input type="date" min={menor} max={maior} value={dia}
      onChange={e => { const d = e.target.value; if (d >= menor && d <= maior) { setInicio(d); escolher(d); } }} /></Campo>}
  </div>;
}
