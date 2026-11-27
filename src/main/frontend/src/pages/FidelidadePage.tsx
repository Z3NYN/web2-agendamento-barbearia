import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Gift, Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { useMarca } from "../components/useMarca";
import { AnimatedValue, Reveal } from "../motion/Primitives";
import { obterToken } from "../services/auth";
import { dataHora, extrairSujeitoToken } from "../services/formato";
import { logoMarca } from "../services/marcaLogo";
import { useConsulta } from "../services/useConsulta";
import type { Cartao } from "../types/Barbearia";

export function CartaoFidelidade({ cartao, cliente }: { cartao: Cartao; cliente: boolean }) {
  const { marca } = useMarca();
  const logo = logoMarca(marca);
  const premios = cartao.historico.filter(m => m.tipo === "RECOMPENSA");
  const disponiveis = premios.filter(p => !p.resgatadoEm && !p.agendamentoId);
  const creditos = cartao.historico.filter(m => m.tipo === "CREDITO");
  const faltam = Math.max(0, cartao.meta - cartao.progresso);
  const pct = Math.min(100, Math.round((cartao.progresso / Math.max(1, cartao.meta)) * 100));

  const [novosSelosDesde, setNovosSelosDesde] = useState<number | null>(null);
  const [novaRecompensa, setNovaRecompensa] = useState(false);
  const avaliado = useRef(false);

  useEffect(() => {
    if (!cliente || avaliado.current) return;
    avaliado.current = true;
    const sujeito = extrairSujeitoToken(obterToken()) ?? "cliente";
    const chave = `studio-fidelidade-v6-${sujeito}`;
    const atual = { progresso: cartao.progresso, premios: premios.length };
    try {
      const salvoRaw = localStorage.getItem(chave);
      if (salvoRaw) {
        const salvo = JSON.parse(salvoRaw) as { progresso?: number; premios?: number };
        if (typeof salvo.progresso === "number" && atual.progresso > salvo.progresso) setNovosSelosDesde(salvo.progresso);
        if (typeof salvo.premios === "number" && atual.premios > salvo.premios) setNovaRecompensa(true);
      }
      localStorage.setItem(chave, JSON.stringify(atual));
    } catch { /* Storage indisponível */ }
  }, [cliente, cartao.progresso, premios.length]);

  return (
    <div className="loyalty-layout">
      <div className="stack">
        <section className={`physical-card${novaRecompensa ? " physical-card--unlocked" : ""}`}>
          <div className="physical-card-head">
            <div className="physical-card-brand">
              {logo ? <img src={logo} alt={marca?.nome ?? "Studio Soldado do Corte"} /> : <strong>{marca?.nome ?? "Studio Soldado do Corte"}</strong>}
            </div>
            <div className="physical-card-tag"><span>Cartão Fidelidade</span>{!cartao.ativo && <small>Pausado</small>}</div>
          </div>
          <div className="physical-card-rule" aria-hidden="true" />
          <div className="physical-card-metric">
            <div className="member-count-row">
              <h2 className="display-title">
                <AnimatedValue value={cartao.progresso} format={n => String(Math.round(n))} duration={460} />
                <span> / {cartao.meta}</span>
              </h2>
              <span className="member-pct tabular">{pct}%</span>
            </div>
            <div className="thin-progress thin-progress--animated" role="progressbar" aria-valuenow={cartao.progresso} aria-valuemin={0} aria-valuemax={cartao.meta}>
              <span style={{ width: `${pct}%` }} />
            </div>
            {cartao.ativo && (
              <p className="member-note">
                {faltam > 0 ? `Faltam ${faltam} ${faltam === 1 ? "serviço concluído" : "serviços concluídos"} para liberar ${cartao.proximoPremio ?? "sua recompensa"}.` : "Meta alcançada. O benefício será emitido na próxima conclusão elegível."}
              </p>
            )}
          </div>
          {cartao.meta <= 12 && (
            <div className="stamp-grid" aria-label={`${cartao.progresso} de ${cartao.meta} selos conquistados`}>
              {Array.from({ length: cartao.meta }, (_, i) => {
                const conquistado = i < cartao.progresso;
                const recemConquistado = conquistado && novosSelosDesde !== null && i >= novosSelosDesde;
                return (
                  <span key={i} className={`stamp-slot${conquistado ? " is-earned" : ""}${recemConquistado ? " is-newly-earned" : ""}`}
                    style={conquistado ? { animationDelay: `${i * 42}ms` } : undefined} aria-hidden="true">
                    {conquistado ? <Check size={15} strokeWidth={2.5} /> : <Scissors size={13} strokeWidth={1.6} />}
                  </span>
                );
              })}
            </div>
          )}
          {cartao.ativo && cartao.proximoPremio && (
            <div className="physical-card-foot">
              <span className="reward-badge-solid"><Gift size={15} strokeWidth={1.8} /></span>
              <div><small>Recompensa da meta</small><strong>{cartao.proximoPremio}</strong></div>
            </div>
          )}
        </section>

        <Reveal variant="up" delay={45}>
          <section className="surface-card stack-sm">
            <h2 className="section-title">Como funciona</h2>
            <ol className="how-it-works">
              <li><span className="how-step">1</span><div><strong>Agende serviços elegíveis</strong><p className="text-secondary">Cada atendimento elegível concluído pela equipe soma um selo no cartão.</p></div></li>
              <li><span className="how-step">2</span><div><strong>Complete {cartao.meta} selos</strong><p className="text-secondary">Ao atingir a meta, o benefício aparece automaticamente em Recompensas.</p></div></li>
              <li><span className="how-step">3</span><div><strong>Resgate no próximo agendamento</strong><p className="text-secondary">Selecione a recompensa disponível para agendar com valor zerado.</p></div></li>
            </ol>
          </section>
        </Reveal>
      </div>

      <div className="stack">
        <Reveal variant="up" delay={30}>
          <section className={`surface-card stack-sm${disponiveis.length > 0 ? " surface-card--highlight" : ""}`}>
            <div className="section-head">
              <h2>Recompensas</h2>
              {disponiveis.length > 0 && <span className="status-pill status-pill--confirmado"><i className="status-dot" aria-hidden="true" />{disponiveis.length} {disponiveis.length === 1 ? "disponível" : "disponíveis"}</span>}
            </div>
            {premios.length === 0 && <Vazio texto="Nenhuma recompensa liberada ainda. Conclua atendimentos elegíveis para acumular selos." />}
            {premios.length > 0 && (
              <div className="list-panel">
                {premios.map(p => {
                  const livre = !p.resgatadoEm && !p.agendamentoId;
                  return (
                    <article className="list-row" key={p.id}>
                      <div className="list-copy">
                        <div className="inline-title">
                          <strong>{p.premio}</strong>
                          <span className={`status-pill ${p.resgatadoEm ? "status-pill--concluido" : p.agendamentoId ? "status-pill--reservado" : "status-pill--confirmado"}`}>
                            <i className="status-dot" aria-hidden="true" />{p.resgatadoEm ? "Utilizada" : p.agendamentoId ? "Reservada" : "Disponível"}
                          </span>
                        </div>
                        <p className="text-secondary tabular">{p.resgatadoEm ? `Utilizada em ${dataHora(p.resgatadoEm)}` : p.agendamentoId ? "Vinculada a um agendamento ativo" : "Disponível para resgate no agendamento"}</p>
                      </div>
                      {cliente && livre && <Link className="btn btn--primario btn--compacto" to={`/agendar?servico=${p.servicoId}&premio=${p.id}`}>Usar <ArrowRight size={14} strokeWidth={1.9} /></Link>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal variant="up" delay={75}>
          <section className="surface-card stack-sm">
            <h2>Histórico de selos</h2>
            {creditos.length === 0 && <Vazio texto="Nenhum atendimento pontuou ainda." />}
            {creditos.length > 0 && (
              <div className="list-panel">
                {creditos.map(c => (
                  <div key={c.id} className="list-row">
                    <span className="tabular text-secondary">{dataHora(c.criadoEm)}</span>
                    <strong className="accent-text tabular">+{c.quantidade} selo</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}

export default function FidelidadePage() {
  const c = useConsulta<Cartao>("/fidelidade");
  return (
    <section className="stack">
      <Titulo eyebrow="Programa de fidelidade" titulo="Fidelidade" detalhe="Acompanhe seus selos reais e resgate recompensas disponíveis." />
      <Aviso erro={c.erro} aoTentarNovamente={c.erro ? c.recarregar : undefined} />
      {c.carregando && <SkeletonList quantidade={3} />}
      {c.dados && <CartaoFidelidade cartao={c.dados} cliente />}
    </section>
  );
}
