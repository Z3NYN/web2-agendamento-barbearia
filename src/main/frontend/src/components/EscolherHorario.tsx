import type { Barbeiro } from "../types/Barbearia";
import { Aviso, Campo, SkeletonSlots } from "./Interface";
import { hoje, hora } from "../services/formato";
import { useConsulta } from "../services/useConsulta";

export default function EscolherHorario({
  barbeiros,
  barbeiro,
  setBarbeiro,
  dia,
  setDia,
  horario,
  setHorario,
  url,
}: {
  barbeiros: Barbeiro[];
  barbeiro: string;
  setBarbeiro: (s: string) => void;
  dia: string;
  setDia: (s: string) => void;
  horario: string;
  setHorario: (s: string) => void;
  url: string | null;
}) {
  return (
    <div className="stack-sm">
      <div className="form-grid-2">
        <Campo nome="Profissional">
          <select
            required
            value={barbeiro}
            onChange={e => {
              setBarbeiro(e.target.value);
              setHorario("");
            }}
          >
            <option value="">Escolha o profissional</option>
            {barbeiros.map(b => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo nome="Data">
          <input
            type="date"
            required
            min={hoje()}
            value={dia}
            onChange={e => {
              setDia(e.target.value);
              setHorario("");
            }}
          />
        </Campo>
      </div>
      <HorariosDisponiveis url={url} horario={horario} setHorario={setHorario} />
    </div>
  );
}

export function HorariosDisponiveis({
  url,
  horario,
  setHorario,
}: {
  url: string | null;
  horario: string;
  setHorario: (s: string) => void;
}) {
  const lista = useConsulta<string[]>(url);
  if (!url) return null;
  return (
    <fieldset className="slots-fieldset">
      <legend>Horários disponíveis</legend>
      <Aviso erro={lista.erro} />
      {lista.carregando && <SkeletonSlots quantidade={6} />}
      {lista.dados?.length === 0 && (
        <p className="text-secondary">Sem horários nessa data. Escolha outro dia ou profissional.</p>
      )}
      {!!lista.dados?.length && (
        <div className="time-grid">
          {lista.dados.map(h => (
            <label key={h} className="time-slot">
              <input
                type="radio"
                name="horario-reagendar"
                value={h}
                checked={horario === h}
                onChange={() => setHorario(h)}
              />
              <span>{hora(h)}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
