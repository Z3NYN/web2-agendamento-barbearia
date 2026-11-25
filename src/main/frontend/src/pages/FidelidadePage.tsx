import { ArrowRight, Check, Gift, Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { Aviso, Titulo, Vazio } from "../components/Interface";
import { useMarca } from "../components/useMarca";
import { Crown } from "lucide-react";
import { dataHora } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import type { Cartao } from "../types/Barbearia";

export function CartaoFidelidade({ cartao, cliente }: { cartao: Cartao; cliente: boolean }) {
  const { marca } = useMarca();
  const premios = cartao.historico.filter(m => m.tipo === "RECOMPENSA");
  const disponiveis = premios.filter(p => !p.resgatadoEm && !p.agendamentoId).length;
  const creditos = cartao.historico.filter(m => m.tipo === "CREDITO");
  const faltam = Math.max(0, cartao.meta - cartao.progresso);
  return <div className="stack studio-loyalty">
    <section className="member-pass">
      {marca?.logo ? <img src={marca.demonstracao && marca.logo === "/api/publico/logo?v=1" ? "/studio/marca.png" : marca.logo} alt={marca.nome} /> : <strong>{marca?.nome}</strong>}
      <small>Cartão de membro</small>
    </section>
    <section className="loyalty-card">
      <div className="section-heading"><strong>Cartão fidelidade</strong><Crown size={23} className="accent" /></div>
      {!cartao.ativo && <span className="tag">Programa pausado</span>}
      <h2>{cartao.progresso} de {cartao.meta} <span>concluídos</span></h2>
      {cartao.ativo && <p>{faltam ? `Faltam ${faltam} para seu benefício` : "A meta atual já foi atingida. A regra é processada na próxima conclusão elegível."}
        {cartao.proximoPremio && faltam > 0 ? ` · ${cartao.proximoPremio}` : ""}</p>}
      <progress aria-label="Progresso da fidelidade" value={Math.min(cartao.progresso, cartao.meta)} max={cartao.meta} />
      {cartao.meta <= 12 && <div className="stamp-grid" aria-hidden="true">
        {Array.from({ length: cartao.meta }, (_, i) => <span className={i < cartao.progresso ? "stamped" : ""} key={i}>
          {i < cartao.progresso ? <Check size={17} /> : <Scissors size={15} />}</span>)}
      </div>}
    </section>
    {cartao.ativo && cartao.proximoPremio && <aside className="proximo-premio"><Gift size={25} />
      <span><strong>Próxima recompensa</strong><small>{cartao.proximoPremio}</small></span>
    </aside>}
    <section className={`panel stack ${disponiveis ? "reward-ready" : ""}`}>
      <h2>Recompensas</h2>
      {disponiveis > 0 && <p className="inline-icon"><Gift size={19} /> {disponiveis === 1 ? "1 recompensa disponível" : `${disponiveis} recompensas disponíveis`}</p>}
      {premios.length === 0 && <Vazio texto="Nenhuma recompensa liberada ainda." />}
      {premios.map(p => <article className="list-row" key={p.id}><div>
        <strong>{p.premio}</strong>
        <p className="muted">{p.resgatadoEm ? `Utilizada em ${dataHora(p.resgatadoEm)}` : p.agendamentoId ? "Vinculada a um agendamento" : "Disponível para agendar"}</p>
      </div>{cliente && !p.resgatadoEm && !p.agendamentoId && <Link className="button button--neutro"
        to={`/agendar?servico=${p.servicoId}&premio=${p.id}`}>Usar recompensa <ArrowRight size={17} /></Link>}</article>)}
    </section>
    <section className="panel stack">
      <h2>Histórico de créditos</h2>
      {creditos.length === 0 && <Vazio texto="Nenhum atendimento pontuou ainda." />}
      {creditos.map(c => <div key={c.id} className="list-row"><span>{dataHora(c.criadoEm)}</span>
        <strong className="accent">+{c.quantidade} atendimento</strong></div>)}
    </section>
  </div>;
}

export default function FidelidadePage() {
  const c = useConsulta<Cartao>("/fidelidade");
  return <><Titulo titulo="Minha fidelidade" detalhe="Acompanhe seu progresso e use suas recompensas ao agendar." />
    <Aviso erro={c.erro} carregando={c.carregando} />{c.dados && <CartaoFidelidade cartao={c.dados} cliente />}</>;
}
