import { useState } from "react";
import { ArrowRight, CalendarDays, Clock3, Gift, MapPin, Phone, Scissors, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useMarca } from "../components/useMarca";
import { Aviso, Vazio } from "../components/Interface";
import { FotoEditorial, Vitrine } from "../components/Experiencia";
import { fotoDe, useFotos } from "../components/FotosPublicas";
import { dataHora, instanteAgenda } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import { obterSessao, temPapel } from "../services/auth";
import { aberturaDemo, fotoServico, fotoProfissional, galeriaDemo } from "../services/fotosDemo";
import { BuscaVitrine, buscaVitrine, CardProfissional, CardServico } from "./VitrinePages";
import type { Agendamento, Barbeiro, Cartao, ExpedientePublico, Servico } from "../types/Barbearia";

const semana = [
  ["MONDAY", "Segunda"], ["TUESDAY", "Terça"], ["WEDNESDAY", "Quarta"], ["THURSDAY", "Quinta"],
  ["FRIDAY", "Sexta"], ["SATURDAY", "Sábado"], ["SUNDAY", "Domingo"],
];
const lembrarAbertura = () => localStorage.setItem("studio-abertura-v3", "vista");

export default function Home() {
  const { marca, erro } = useMarca();
  const { pathname } = useLocation();
  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const profissionais = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const expediente = useConsulta<ExpedientePublico[]>("/publico/expediente");
  const fotos = useFotos();
  const sessao = obterSessao();
  const cliente = temPapel("CLIENTE");
  const equipe = temPapel("ADMIN") || temPapel("BARBEIRO");
  const agenda = useConsulta<Agendamento[]>(cliente ? "/agendamentos" : null);
  const cartao = useConsulta<Cartao>(cliente && marca?.fidelidadeAtiva ? "/fidelidade" : null);
  const proximo = agenda.dados?.filter(a => ["RESERVADO", "CONFIRMADO"].includes(a.status) && instanteAgenda(a.inicio) > Date.now()).at(-1);
  const [busca, setBusca] = useState("");
  const [servico, setServico] = useState("");
  const lista = servicos.dados?.filter(s => buscaVitrine(busca, s.nome, s.descricao));
  const pessoas = profissionais.dados?.filter(b => buscaVitrine(busca, b.nome, b.descricao));
  const selecionado = servicos.dados?.find(s => String(s.id) === servico) ?? servicos.dados?.[0];
  const horarios = useConsulta<string[]>(selecionado && !equipe ? `/publico/proximos-horarios?servicoId=${selecionado.id}` : null);
  const fotoAbertura = fotoDe(fotos.dados, "ABERTURA")?.url;
  const capa = fotoDe(fotos.dados, "CAPA")?.url;
  const galeria = fotos.dados?.filter(f => f.alvo === "GALERIA") ?? [];
  const fotosGaleria = galeria.length > 0 ? galeria : fotos.dados && marca?.demonstracao ? galeriaDemo : [];
  const abrir = pathname === "/" && !sessao && !localStorage.getItem("studio-abertura-v3");

  if (abrir) return <section className="studio-abertura">
    <FotoEditorial className="abertura-fundo" src={fotoAbertura ?? capa ?? (marca?.demonstracao ? aberturaDemo : undefined)} prioridade />
    <div className="abertura-marca">{marca?.logo ? <img src={marca.demonstracao && marca.logo === "/api/publico/logo?v=1" ? "/studio/marca.png" : marca.logo} alt={marca.nome} /> : <strong>{marca?.nome ?? "Studio Soldado do Corte"}</strong>}</div>
    <div className="abertura-copy">
      <h1>Seu estilo,<br /><em>no lugar certo.</em></h1>
      <p>{marca?.descricao || "Corte, barba e cuidado no seu horário."}</p>
      <div className="abertura-acoes"><Link to="/agendar" className="button button--primario" onClick={lembrarAbertura}><CalendarDays size={19} /> Agendar agora <ArrowRight size={19} /></Link>
        <Link to="/inicio" className="studio-text-link" onClick={lembrarAbertura}>Conhecer o studio <ArrowRight size={17} /></Link></div>
      {!fotoAbertura && !capa && marca?.demonstracao && <small>Imagem ilustrativa</small>}
    </div>
  </section>;

  return <div className="studio-home">
    <section className="home-welcome">
      <div><div className="eyebrow">{marca?.nome ?? "Studio Soldado do Corte"}</div>
        <h1>{sessao ? `Olá, ${sessao.nome.trim().split(/\s+/)[0]}` : "Encontre seu próximo estilo"}</h1></div>
      {sessao && <Link to="/perfil" className="icon-btn" aria-label="Minha conta"><UserRound size={22} /></Link>}
    </section>
    <Aviso erro={erro} />
    <BuscaVitrine valor={busca} alterar={setBusca} rotulo="Buscar serviços ou profissionais" />
    {!busca.trim() && <>
      <section className="studio-banner">
        <FotoEditorial src={capa ?? (marca?.demonstracao ? "/studio/banner.webp" : undefined)} prioridade />
        <div><h2>Mantenha seu<br />estilo em dia.</h2>
          <Link to={equipe ? "/agenda" : "/agendar"} className="button button--primario">{equipe ? "Abrir agenda" : "Agendar agora"} <ArrowRight size={17} /></Link>
          {!capa && marca?.demonstracao && <small>Imagem ilustrativa</small>}
        </div>
      </section>
      {proximo && <Link to="/meus-horarios" className="panel studio-inline-card">
        <span className="large-icon"><CalendarDays size={22} /></span>
        <span><small className="accent">Seu próximo atendimento</small><strong>{proximo.servico} · {dataHora(proximo.inicio)}</strong><small className="muted">Com {proximo.barbeiro}</small></span>
        <ArrowRight size={18} /></Link>}
    </>}
    <section className="stack" id="catalogo">
      <div className="section-heading"><h2>Serviços</h2><Link to="/catalogo" className="studio-text-link">Ver todos <ArrowRight size={15} /></Link></div>
      <Aviso erro={servicos.erro} carregando={servicos.carregando} />
      {marca?.demonstracao && <p className="demo-caption">Preços e fotos ilustrativos</p>}
      {lista?.length === 0 && <Vazio texto="Nenhum serviço encontrado." />}
      {!!lista?.length && <>
        <div className="service-categories">{lista.map(s => <button type="button" key={s.id}
          onClick={() => setServico(String(s.id))} aria-pressed={selecionado?.id === s.id}><Scissors size={20} />{s.nome}</button>)}</div>
        <Vitrine titulo="serviços">{lista.map(s => <CardServico s={s} key={s.id} foto={fotoServico(fotos.dados, s, marca?.demonstracao)} />)}</Vitrine>
      </>}
    </section>
    {!equipe && selecionado && !busca.trim() && <section className="panel stack disponibilidade-home">
      <div className="section-heading"><h2>Próximos horários</h2><Clock3 size={20} className="accent" /></div>
      <p className="muted">{selecionado.nome} · qualquer profissional</p>
      <Aviso erro={horarios.erro} carregando={horarios.carregando} />
      {horarios.dados?.length === 0 && <p className="muted">Nenhum horário encontrado nos próximos 14 dias.</p>}
      <div className="slot-links">{horarios.dados?.map(h => <Link className="button button--neutro" key={h}
        to={`/agendar?servico=${selecionado.id}&profissional=qualquer&dia=${h.slice(0, 10)}&horario=${encodeURIComponent(h)}`}>{dataHora(h)}</Link>)}</div>
    </section>}
    <section className="stack">
      <div className="section-heading"><h2>Profissionais</h2><Link className="studio-text-link" to="/equipe">Ver equipe <ArrowRight size={15} /></Link></div>
      <Aviso erro={profissionais.erro} carregando={profissionais.carregando} />
      {marca?.demonstracao && <p className="demo-caption">Perfis e fotos de demonstração</p>}
      {pessoas?.length === 0 && <Vazio texto="Nenhum profissional encontrado." />}
      {!!pessoas?.length && <Vitrine titulo="profissionais">{pessoas.map(b =>
        <CardProfissional b={b} key={b.id} foto={fotoProfissional(fotos.dados, b, marca?.demonstracao)} />)}</Vitrine>}
    </section>
    {!busca.trim() && <>
      {marca?.fidelidadeAtiva && !equipe && <Link className="panel studio-inline-card home-fidelidade" to="/fidelidade">
        <span className="large-icon"><Gift size={24} /></span><span><strong>Cartão fidelidade</strong>
          <small>{cartao.dados ? `${cartao.dados.progresso} de ${cartao.dados.meta} concluídos` : `A cada ${marca.meta} atendimentos elegíveis, ganhe ${marca.nomePremio}.`}</small></span>
        <ArrowRight size={18} /></Link>}
      <section className="stack"><div className="section-heading"><h2>Galeria</h2><Link className="studio-text-link" to="/galeria">Ver galeria <ArrowRight size={15} /></Link></div>
        {fotosGaleria.length > 0 && <Vitrine titulo="galeria">{fotosGaleria.map(f => <Link key={f.id} to="/galeria" className="studio-card studio-card--galeria">
          <FotoEditorial src={f.url} /><span>{f.legenda || "Ver galeria"}</span></Link>)}</Vitrine>}
        {!galeria.length && marca?.demonstracao && <p className="demo-caption">Imagens ilustrativas</p>}
      </section>
      <details className="panel studio-info"><summary>Expediente e contato</summary>
        <div className="contact-v2"><div className="stack"><h2>Expediente</h2><Aviso erro={expediente.erro} carregando={expediente.carregando} />
          {expediente.dados?.length === 0 && <p className="muted">Expediente ainda não publicado.</p>}
          <dl className="hours-list">{semana.map(([chave, nome]) => {
            const faixas = expediente.dados?.filter(f => f.dia === chave).sort((a, b) => a.inicio.localeCompare(b.inicio)) ?? [];
            return faixas.length ? <div key={chave}><dt>{nome}</dt><dd>{faixas.map(f => f.inicio.slice(0, 5) + " – " + f.fim.slice(0, 5)).join(" · ")}</dd></div> : null;
          })}</dl></div>
          {(marca?.endereco || marca?.telefone || marca?.whatsapp || marca?.instagram) && <div className="stack"><h2>Contato</h2>
            {marca.endereco && <p className="inline-icon"><MapPin size={18} /> {marca.endereco}</p>}
            {marca.telefone && <p className="inline-icon"><Phone size={18} /> {marca.telefone}</p>}
            {marca.whatsapp && <a className="studio-text-link" href={`https://wa.me/${marca.whatsapp}`}>WhatsApp</a>}
            {marca.instagram && <a className="studio-text-link" href={`https://www.instagram.com/${marca.instagram}/`}>Instagram</a>}
          </div>}</div>
      </details>
    </>}
  </div>;
}
