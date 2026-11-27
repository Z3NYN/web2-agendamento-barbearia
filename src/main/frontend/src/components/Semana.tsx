import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Campo } from "./Interface";
import { dataIsoValida, hoje } from "../services/formato";

export function somarDias(iso: string, dias: number): string {
  const segura = dataIsoValida(iso);
  const data = new Date(segura + "T12:00:00Z");
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtDiaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const fmtCompleta = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" });
const utc = (s: string) => new Date(dataIsoValida(s) + "T12:00:00Z");

export default function Semana({ dia, escolher, permitirPassado = false }: {
  dia: string; escolher: (dia: string) => void; permitirPassado?: boolean;
}) {
  const atual = hoje();
  const diaSeguro = dataIsoValida(dia, atual);
  const menor = permitirPassado ? somarDias(atual, -365) : atual;
  const maior = somarDias(atual, 90);
  const [inicio, setInicio] = useState(diaSeguro >= menor && diaSeguro <= maior ? diaSeguro : atual);
  const [direcao, setDirecao] = useState<"next" | "prev">("next");
  const [calendario, setCalendario] = useState(false);

  useEffect(() => {
    setInicio(anterior => (diaSeguro < anterior || diaSeguro > somarDias(anterior, 6) ? diaSeguro : anterior));
  }, [diaSeguro]);

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));

  return (
    <div className="week-picker">
      <div className="week-bar">
        <div className="week-month-group">
          <strong className="week-month" aria-live="polite">{fmtMes.format(utc(dias[3]))}</strong>
          <button type="button" className="week-jump-btn" aria-expanded={calendario} onClick={() => setCalendario(v => !v)}>
            <CalendarDays size={13} strokeWidth={1.75} />
            <span>{calendario ? "Ocultar" : "Outro mês"}</span>
          </button>
        </div>
        <div className="week-nav">
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Semana anterior" disabled={inicio <= menor}
            onClick={() => { setDirecao("prev"); const alvo = somarDias(inicio, -7); setInicio(alvo < menor ? menor : alvo); }}>
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Próxima semana" disabled={dias[6] >= maior}
            onClick={() => { setDirecao("next"); const alvo = somarDias(inicio, 7); if (alvo <= maior) setInicio(alvo); }}>
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="week-strip-wrap">
        <div className="week-strip" data-dir={direcao} key={inicio} role="group" aria-label="Dias da semana">
          {dias.map(d => {
            const ehHoje = d === atual;
            const ativo = d === diaSeguro;
            return (
              <button key={d} type="button" className={`day-pill${ativo ? " is-selected" : ""}${ehHoje ? " is-today" : ""}`}
                disabled={d > maior || d < menor} aria-label={fmtCompleta.format(utc(d))} aria-pressed={ativo} onClick={() => escolher(d)}>
                <span className="day-pill-wk">{fmtDiaSemana.format(utc(d)).replace(".", "").slice(0, 3)}</span>
                <strong className="day-pill-num">{d.slice(8)}</strong>
                {ehHoje && <i className="day-pill-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`collapsible${calendario ? " is-open" : ""}`}>
        <div>
          <div className="week-date-jump">
            <Campo nome="Escolher data específica">
              <input type="date" min={menor} max={maior} value={diaSeguro}
                onChange={e => { const d = dataIsoValida(e.target.value, ""); if (d && d >= menor && d <= maior) { setInicio(d); escolher(d); } }} />
            </Campo>
          </div>
        </div>
      </div>
    </div>
  );
}
