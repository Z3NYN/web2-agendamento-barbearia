import { ArrowRight, Check, Crown, Gift, Scissors, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { useMarca } from "../components/useMarca";
import { AnimatedValue, Reveal } from "../motion/Primitives";
import { dataHora } from "../services/formato";
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
  const metaAtingida = cartao.progresso >= cartao.meta || disponiveis.length > 0;

  return (
    <div className="loyalty-layout">
      <div className="stack">
        <section className={`member-card${metaAtingida ? " member-card--milestone" : ""}`}>
          <div className="member-card-top">
            <div className="member-card-brand">
              {logo ? (
                <img src={logo} alt={marca?.nome ?? "Studio Soldado do Corte"} />
              ) : (
                <strong>{marca?.nome ?? "Studio Soldado do Corte"}</strong>
              )}
            </div>
            <span className="member-pill">
              {metaAtingida ? <Sparkles size={13} /> : <Crown size={13} />}
              {metaAtingida ? "Recompensa ativa" : "Membro"}
            </span>
          </div>

          <div className="member-card-progress">
            <div className="member-count-row">
              <div>
                {!cartao.ativo && <span className="tag">Programa pausado</span>}
                <h2>
                  <AnimatedValue value={cartao.progresso} format={n => String(Math.round(n))} duration={480} />
                  <span> / {cartao.meta} serviços</span>
                </h2>
              </div>
              <span className="member-pct tabular">
                <AnimatedValue value={pct} format={n => `${Math.round(n)}%`} duration={520} />
              </span>
            </div>

            <div
              className="thin-progress thin-progress--animated"
              role="progressbar"
              aria-valuenow={cartao.progresso}
              aria-valuemin={0}
              aria-valuemax={cartao.meta}
            >
              <span style={{ width: `${pct}%` }} />
            </div>

            {cartao.ativo && (
              <p className="member-note">
                {faltam > 0
                  ? `Faltam ${faltam} ${faltam === 1 ? "atendimento concluído" : "atendimentos concluídos"} para conquistar ${cartao.proximoPremio ?? "sua recompensa"}.`
                  : "Meta alcançada. A recompensa é processada automaticamente na conclusão do atendimento elegível."}
              </p>
            )}
          </div>

          {cartao.meta <= 12 && (
            <div className="stamp-grid" aria-label={`${cartao.progresso} de ${cartao.meta} selos conquistados`}>
              {Array.from({ length: cartao.meta }, (_, i) => {
                const conquistado = i < cartao.progresso;
                return (
                  <span
                    key={i}
                    className={`stamp-slot${conquistado ? " is-earned" : ""}`}
                    style={conquistado ? { animationDelay: `${i * 55}ms` } : undefined}
                    aria-hidden="true"
                  >
                    {conquistado ? <Check size={15} strokeWidth={2.5} /> : <Scissors size={13} strokeWidth={1.6} />}
                  </span>
                );
              })}
            </div>
          )}

          {cartao.ativo && cartao.proximoPremio && (
            <div className="next-reward-row">
              <span className="reward-badge-solid"><Gift size={16} /></span>
              <div>
                <small>Próxima recompensa</small>
                <strong>{cartao.proximoPremio}</strong>
              </div>
            </div>
          )}
        </section>

        <Reveal variant="up" delay={60}>
          <section className="surface-card stack-sm">
            <h2 className="section-title">Como funciona?</h2>
            <ol className="how-it-works">
              <li>
                <span className="how-step">1</span>
                <div>
                  <strong>Agende e realize serviços elegíveis</strong>
                  <p className="text-secondary">Cada atendimento concluído pela equipe contabiliza no seu cartão.</p>
                </div>
              </li>
              <li>
                <span className="how-step">2</span>
                <div>
                  <strong>Acumule selos automaticamente</strong>
                  <p className="text-secondary">Ao completar {cartao.meta} atendimentos, sua recompensa é liberada.</p>
                </div>
              </li>
              <li>
                <span className="how-step">3</span>
                <div>
                  <strong>Resgate direto no agendamento</strong>
                  <p className="text-secondary">Selecione a recompensa disponível na revisão da sua próxima reserva.</p>
                </div>
              </li>
            </ol>
          </section>
        </Reveal>
      </div>

      <div className="stack">
        <Reveal variant="up" delay={40}>
          <section className={`surface-card stack-sm${disponiveis.length > 0 ? " surface-card--highlight" : ""}`}>
            <div className="section-head">
              <h2>Recompensas</h2>
              {disponiveis.length > 0 && (
                <span className="status-pill status-pill--confirmado">
                  <i className="status-dot" aria-hidden="true" />
                  {disponiveis.length} {disponiveis.length === 1 ? "disponível" : "disponíveis"}
                </span>
              )}
            </div>

            {premios.length === 0 && (
              <Vazio texto="Nenhuma recompensa liberada ainda. Conclua atendimentos elegíveis para acumular selos." />
            )}

            {premios.length > 0 && (
              <div className="list-panel">
                {premios.map(p => {
                  const livre = !p.resgatadoEm && !p.agendamentoId;
                  return (
                    <article className="list-row" key={p.id}>
                      <div className="list-copy">
                        <div className="inline-title">
                          <strong>{p.premio}</strong>
                          <span
                            className={`status-pill ${
                              p.resgatadoEm
                                ? "status-pill--concluido"
                                : p.agendamentoId
                                  ? "status-pill--reservado"
                                  : "status-pill--confirmado"
                            }`}
                          >
                            <i className="status-dot" aria-hidden="true" />
                            {p.resgatadoEm ? "Utilizada" : p.agendamentoId ? "Reservada" : "Disponível"}
                          </span>
                        </div>
                        <p className="text-secondary tabular">
                          {p.resgatadoEm
                            ? `Utilizada em ${dataHora(p.resgatadoEm)}`
                            : p.agendamentoId
                              ? "Vinculada a um agendamento ativo"
                              : "Pronta para usar no próximo agendamento"}
                        </p>
                      </div>
                      {cliente && livre && (
                        <Link
                          className="btn btn--primario btn--compacto"
                          to={`/agendar?servico=${p.servicoId}&premio=${p.id}`}
                        >
                          Usar <ArrowRight size={14} />
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal variant="up" delay={90}>
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
      <Titulo
        eyebrow="Programa de fidelidade"
        titulo="Fidelidade"
        detalhe="Acumule atendimentos concluídos e resgate recompensas exclusivas."
      />
      <Aviso erro={c.erro} />
      {c.carregando && <SkeletonList quantidade={3} />}
      {c.dados && <CartaoFidelidade cartao={c.dados} cliente />}
    </section>
  );
}
