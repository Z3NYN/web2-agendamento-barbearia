import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Search } from "lucide-react";
import { Aviso, Titulo, Vazio } from "../components/Interface";
import { FotoEditorial, PainelModal } from "../components/Experiencia";
import { useFotos } from "../components/FotosPublicas";
import { useMarca } from "../components/useMarca";
import { dataHora, moeda } from "../services/formato";
import { fotoProfissional, fotoServico, galeriaDemo } from "../services/fotosDemo";
import { useConsulta } from "../services/useConsulta";
import type { Barbeiro, Servico } from "../types/Barbearia";

export function CardServico({ s, foto }: { s: Servico; foto?: string }) {
  return <Link className="studio-card studio-card--servico" to={`/agendar?servico=${s.id}`}>
    <FotoEditorial src={foto} />
    <div className="studio-card-copy"><h3>{s.nome}</h3>
      <span className="inline-icon muted"><Clock3 size={14} /> {s.duracaoMinutos} min</span>
      {s.descricao && <p className="muted">{s.descricao}</p>}
      <span className="studio-card-tail"><strong>{moeda(s.preco)}</strong><span className="round-arrow"><ArrowRight size={17} /></span></span>
    </div>
  </Link>;
}

export function CardProfissional({ b, foto }: { b: Barbeiro; foto?: string }) {
  return <Link className="studio-card studio-card--pessoa" to={`/equipe/${b.id}`}>
    <FotoEditorial src={foto} />
    <div className="studio-card-copy"><h3>{b.nome}</h3><span className="studio-card-tail">
      <span className="muted">{b.descricao || "Ver disponibilidade"}</span><span className="round-arrow"><ArrowRight size={16} /></span>
    </span></div>
  </Link>;
}

function normalizar(valor: string) { return valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }
export function buscaVitrine(busca: string, nome: string, descricao?: string | null) {
  return normalizar(nome + " " + (descricao ?? "")).includes(normalizar(busca));
}

export function BuscaVitrine({ valor, alterar, rotulo }: { valor: string; alterar: (s: string) => void; rotulo: string }) {
  return <label className="studio-search"><Search size={19} /><input type="search" value={valor} onChange={e => alterar(e.target.value)}
    placeholder={rotulo} aria-label={rotulo} /></label>;
}

export function ServicosPublicos() {
  const { marca } = useMarca();
  const fotos = useFotos();
  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const [busca, setBusca] = useState("");
  const lista = servicos.dados?.filter(s => buscaVitrine(busca, s.nome, s.descricao));
  return <section className="studio-page stack">
    <Titulo titulo="Serviços" detalhe="Escolha o cuidado certo para o seu estilo." />
    <BuscaVitrine valor={busca} alterar={setBusca} rotulo="Buscar serviços" />
    <Aviso erro={servicos.erro} carregando={servicos.carregando} />
    {marca?.demonstracao && <p className="muted">Preços e fotos de demonstração.</p>}
    {lista?.length === 0 && <Vazio texto="Nenhum serviço encontrado." />}
    <div className="catalog-v3">{lista?.map(s => <CardServico s={s} key={s.id} foto={fotoServico(fotos.dados, s, marca?.demonstracao)} />)}</div>
  </section>;
}

export function EquipePublica() {
  const { id } = useParams();
  const { marca } = useMarca();
  const fotos = useFotos();
  const equipe = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const [busca, setBusca] = useState("");
  const [servico, setServico] = useState("");
  const b = equipe.dados?.find(p => String(p.id) === id);
  const selecionado = servicos.dados?.find(s => String(s.id) === servico) ?? servicos.dados?.[0];
  const proximos = useConsulta<string[]>(b && selecionado ? `/publico/proximos-horarios?barbeiroId=${b.id}&servicoId=${selecionado.id}` : null);
  if (id && b) return <section className="studio-page perfil-publico stack">
    <Link to="/equipe" className="studio-text-link"><ArrowLeft size={18} /> Equipe</Link>
    <FotoEditorial src={fotoProfissional(fotos.dados, b, marca?.demonstracao)} className="perfil-foto" prioridade />
    <div className="panel stack">
      <Titulo titulo={b.nome} detalhe={b.descricao ?? undefined} />
      {marca?.demonstracao && <p className="muted">Perfil de demonstração.</p>}
      <label className="field">Serviço para consultar<select value={selecionado?.id ?? ""} onChange={e => setServico(e.target.value)}>
        {servicos.dados?.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </select></label>
      <h2>Próximos horários</h2><Aviso erro={proximos.erro || servicos.erro} carregando={proximos.carregando} />
      <div className="slot-links">{proximos.dados?.map(h => <Link className="button button--neutro" key={h}
        to={`/agendar?servico=${selecionado?.id}&profissional=${b.id}&dia=${h.slice(0, 10)}&horario=${encodeURIComponent(h)}`}>{dataHora(h)}</Link>)}</div>
      {proximos.dados?.length === 0 && <p className="muted">Sem horários nos próximos 14 dias para este serviço.</p>}
      <Link className="button button--primario" to={`/agendar?profissional=${b.id}`}><CalendarDays size={18} /> Agendar com {b.nome}</Link>
    </div>
  </section>;
  if (id) return <section className="stack"><Aviso erro={equipe.erro} carregando={equipe.carregando} />
    {equipe.dados && <Vazio texto="Profissional indisponível." />} <Link to="/equipe" className="studio-text-link">Ver equipe</Link></section>;
  const lista = equipe.dados?.filter(p => buscaVitrine(busca, p.nome, p.descricao));
  return <section className="studio-page stack"><Titulo titulo="Profissionais" detalhe="Conheça a equipe e consulte a agenda." />
    <BuscaVitrine valor={busca} alterar={setBusca} rotulo="Buscar profissionais" />
    <Aviso erro={equipe.erro} carregando={equipe.carregando} />
    {marca?.demonstracao && <p className="muted">Perfis e fotos de demonstração.</p>}
    {lista?.length === 0 && <Vazio texto="Nenhum profissional encontrado." />}
    <div className="catalog-v3 equipe-v3">{lista?.map(p => <CardProfissional b={p} key={p.id} foto={fotoProfissional(fotos.dados, p, marca?.demonstracao)} />)}</div>
  </section>;
}

export function GaleriaPage() {
  const { marca } = useMarca();
  const fotos = useFotos();
  const [categoria, setCategoria] = useState("Todas");
  const [indice, setIndice] = useState<number>();
  const toque = useRef(0);
  const publicadas = fotos.dados?.filter(f => f.alvo === "GALERIA") ?? [];
  const exemplos = fotos.dados && publicadas.length === 0 && marca?.demonstracao;
  const todas = exemplos ? galeriaDemo : publicadas;
  const categorias = ["Todas", ...new Set(todas.map(f => f.categoria ?? "Outros"))];
  const lista = todas.filter(f => categoria === "Todas" || (f.categoria ?? "Outros") === categoria);
  const ampliada = indice === undefined ? undefined : lista[indice];
  function mover(delta: number) { setIndice(i => ((i ?? 0) + delta + lista.length) % lista.length); }
  return <section className="studio-page stack"><Titulo titulo="Galeria" detalhe="Encontre referências para o seu próximo corte." />
    {exemplos && <p className="muted">Imagens ilustrativas. Os trabalhos publicados pela barbearia aparecem aqui.</p>}
    <div className="tabs" aria-label="Categorias">{categorias.map(c => <button key={c} type="button"
      aria-pressed={c === categoria} onClick={() => setCategoria(c)}>{c}</button>)}</div>
    <Aviso erro={fotos.erro} carregando={fotos.carregando} />
    {fotos.dados && lista.length === 0 && <Vazio texto="Nenhuma fotografia nesta categoria." />}
    <div className="gallery-grid">{lista.map((f, i) => <button type="button" className="gallery-item" key={f.id}
      onClick={() => setIndice(i)}><FotoEditorial src={f.url} /><span>{f.legenda || "Ampliar fotografia"}</span></button>)}</div>
    {ampliada && <PainelModal titulo={ampliada.legenda || "Fotografia da galeria"} fechar={() => setIndice(undefined)}>
      <div className="gallery-zoom" onTouchStart={e => { toque.current = e.touches[0].clientX; }}
        onTouchEnd={e => { const delta = e.changedTouches[0].clientX - toque.current; if (Math.abs(delta) > 45) mover(delta < 0 ? 1 : -1); }}
        onKeyDown={e => { if (e.key === "ArrowLeft") mover(-1); if (e.key === "ArrowRight") mover(1); }}>
        <FotoEditorial src={ampliada.url} alt={ampliada.legenda ?? "Foto publicada"} prioridade />
        <div className="section-heading"><button type="button" className="icon-btn" onClick={() => mover(-1)} aria-label="Foto anterior"><ChevronLeft /></button>
          <span aria-live="polite">{(indice ?? 0) + 1} / {lista.length}</span>
          <button type="button" className="icon-btn" onClick={() => mover(1)} aria-label="Próxima foto"><ChevronRight /></button></div>
      </div>
    </PainelModal>}
  </section>;
}
