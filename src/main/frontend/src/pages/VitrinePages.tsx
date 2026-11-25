import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Search, UsersRound } from "lucide-react";
import { Aviso, SkeletonCards, SkeletonSlots, Titulo, Vazio } from "../components/Interface";
import { FotoEditorial, PainelModal } from "../components/Experiencia";
import { useFotos } from "../components/FotosPublicas";
import { useMarca } from "../components/useMarca";
import { Reveal } from "../motion/Primitives";
import { dataHora, moeda } from "../services/formato";
import { fotoProfissional, fotoServico, galeriaDemo } from "../services/fotosDemo";
import { useConsulta } from "../services/useConsulta";
import type { Barbeiro, Servico } from "../types/Barbearia";

function especialidadesDe(descricao?: string | null): string[] {
  if (!descricao) return [];
  return descricao
    .split(/[,·•|]/g)
    .map(p => p.trim())
    .filter(p => p.length > 0 && p.length <= 36)
    .slice(0, 3);
}

export function CardServico({ s, foto, horizontal = false }: { s: Servico; foto?: string; horizontal?: boolean }) {
  return (
    <Link className={`studio-card service-card${horizontal ? " service-card--row" : ""}`} to={`/agendar?servico=${s.id}`}>
      <FotoEditorial src={foto} alt={s.nome} className="service-card-media" revelar={horizontal ? "fade" : "curtain"} />
      <div className="service-card-body">
        <div className="service-card-top">
          <h3>{s.nome}</h3>
          <span className="meta-chip tabular">
            <Clock3 size={12} /> {s.duracaoMinutos} min
          </span>
        </div>
        {s.descricao && <p className="card-desc">{s.descricao}</p>}
        <div className="service-card-foot">
          <strong className="price-value tabular">{moeda(s.preco)}</strong>
          <span className="service-cta">
            Agendar <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CardProfissional({ b, foto }: { b: Barbeiro; foto?: string }) {
  return (
    <Link className="barber-portrait-card" to={`/equipe/${b.id}`}>
      <FotoEditorial src={foto} alt={b.nome} className="barber-portrait-media" revelar="curtain" />
      <div className="barber-portrait-scrim" aria-hidden="true" />
      <div className="barber-portrait-overlay">
        <div className="barber-portrait-copy">
          <h3>{b.nome}</h3>
          <p>{b.descricao || "Ver horários disponíveis"}</p>
        </div>
        <span className="barber-portrait-arrow" aria-hidden="true">
          <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}

function CardProfissionalLista({ b, foto }: { b: Barbeiro; foto?: string }) {
  const tags = especialidadesDe(b.descricao);
  return (
    <Link className="studio-card barber-row-card" to={`/equipe/${b.id}`}>
      <FotoEditorial src={foto} alt={b.nome} className="barber-row-media" revelar="fade" />
      <div className="barber-row-body">
        <div className="barber-row-top">
          <h3>{b.nome}</h3>
          <ChevronRight size={17} className="muted-arrow" />
        </div>
        {tags.length > 1 ? (
          <div className="tag-row">
            {tags.map(t => (
              <span className="meta-chip" key={t}>{t}</span>
            ))}
          </div>
        ) : (
          <p className="card-desc">{b.descricao || "Consultar agenda e horários disponíveis"}</p>
        )}
        <span className="service-cta">
          Ver disponibilidade <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function buscaVitrine(busca: string, nome: string, descricao?: string | null) {
  return normalizar(nome + " " + (descricao ?? "")).includes(normalizar(busca));
}

export function BuscaVitrine({ valor, alterar, rotulo }: { valor: string; alterar: (s: string) => void; rotulo: string }) {
  return (
    <label className="search-pill">
      <Search size={17} />
      <input
        type="search"
        value={valor}
        onChange={e => alterar(e.target.value)}
        placeholder={rotulo}
        aria-label={rotulo}
      />
    </label>
  );
}

export function ServicosPublicos() {
  const { marca } = useMarca();
  const fotos = useFotos();
  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "fidelidade" | "rapidos" | "completos">("todos");

  const temRapidos = Boolean(servicos.dados?.some(s => s.duracaoMinutos <= 30));
  const temCompletos = Boolean(servicos.dados?.some(s => s.duracaoMinutos > 30));

  const lista = servicos.dados?.filter(s => {
    if (!buscaVitrine(busca, s.nome, s.descricao)) return false;
    if (filtro === "fidelidade") return s.elegivel;
    if (filtro === "rapidos") return s.duracaoMinutos <= 30;
    if (filtro === "completos") return s.duracaoMinutos > 30;
    return true;
  });

  return (
    <section className="stack">
      <Titulo
        eyebrow={marca?.nome ?? "Catálogo"}
        titulo="Serviços"
        detalhe="Selecione o serviço desejado para consultar os horários disponíveis."
      />

      <div className="filter-bar">
        <BuscaVitrine valor={busca} alterar={setBusca} rotulo="Buscar serviços" />
        <div className="chip-scroll" role="group" aria-label="Filtrar serviços">
          <button type="button" className="chip" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>
            Todos
          </button>
          {marca?.fidelidadeAtiva && (
            <button type="button" className="chip" aria-pressed={filtro === "fidelidade"} onClick={() => setFiltro("fidelidade")}>
              Fidelidade
            </button>
          )}
          {temRapidos && temCompletos && (
            <>
              <button type="button" className="chip" aria-pressed={filtro === "rapidos"} onClick={() => setFiltro("rapidos")}>
                Até 30 min
              </button>
              <button type="button" className="chip" aria-pressed={filtro === "completos"} onClick={() => setFiltro("completos")}>
                Completos
              </button>
            </>
          )}
        </div>
      </div>

      <Aviso erro={servicos.erro} />
      {servicos.carregando && <SkeletonCards quantidade={3} />}
      {!servicos.carregando && lista?.length === 0 && <Vazio texto="Nenhum serviço encontrado." />}

      {!!lista?.length && (
        <div className="catalog-grid" key={filtro}>
          {lista.map((s, idx) => (
            <Reveal key={s.id} staggerIndex={idx} variant="up">
              <CardServico s={s} foto={fotoServico(fotos.dados, s, marca?.demonstracao)} horizontal />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
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
  const proximos = useConsulta<string[]>(
    b && selecionado ? `/publico/proximos-horarios?barbeiroId=${b.id}&servicoId=${selecionado.id}` : null
  );

  if (id && b) {
    const tags = especialidadesDe(b.descricao);
    return (
      <section className="barber-profile-page stack">
        <div>
          <Link to="/equipe" className="text-link">
            <ArrowLeft size={16} /> Voltar para profissionais
          </Link>
        </div>

        <div className="barber-profile-grid">
          <div className="barber-profile-media-card">
            <FotoEditorial
              src={fotoProfissional(fotos.dados, b, marca?.demonstracao)}
              alt={b.nome}
              className="barber-profile-photo"
              prioridade
              revelar="curtain"
            />
            <div className="barber-profile-identity">
              <h1>{b.nome}</h1>
              {tags.length > 1 ? (
                <div className="tag-row">
                  {tags.map(t => (
                    <span className="meta-chip" key={t}>{t}</span>
                  ))}
                </div>
              ) : (
                b.descricao && <p className="text-secondary">{b.descricao}</p>
              )}
            </div>
          </div>

          <div className="surface-card stack">
            <div className="field">
              <label htmlFor="servico-perfil-barbeiro">Consultar disponibilidade para</label>
              <select
                id="servico-perfil-barbeiro"
                value={selecionado?.id ?? ""}
                onChange={e => setServico(e.target.value)}
              >
                {servicos.dados?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nome} · {s.duracaoMinutos} min · {moeda(s.preco)}
                  </option>
                ))}
              </select>
            </div>

            <div className="stack-xs">
              <h2 className="section-title">Próximos horários</h2>
              <Aviso erro={proximos.erro || servicos.erro} />
              {proximos.carregando && <SkeletonSlots quantidade={4} />}
              {!proximos.carregando && proximos.dados?.length === 0 && (
                <p className="text-secondary">Sem horários nos próximos 14 dias para este serviço.</p>
              )}
              {!!proximos.dados?.length && (
                <div className="quick-slots">
                  {proximos.dados.map(h => (
                    <Link
                      className="slot-link tabular"
                      key={h}
                      to={`/agendar?servico=${selecionado?.id}&profissional=${b.id}&dia=${h.slice(0, 10)}&horario=${encodeURIComponent(h)}`}
                    >
                      {dataHora(h)}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link className="btn btn--primario btn--full" to={`/agendar?profissional=${b.id}`}>
              <CalendarDays size={17} /> Agendar com {b.nome}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (id) {
    return (
      <section className="stack">
        <Aviso erro={equipe.erro} carregando={equipe.carregando} />
        {equipe.dados && <Vazio texto="Profissional indisponível." />}
        <Link to="/equipe" className="text-link"><ArrowLeft size={16} /> Voltar para a equipe</Link>
      </section>
    );
  }

  const lista = equipe.dados?.filter(p => buscaVitrine(busca, p.nome, p.descricao));

  return (
    <section className="stack">
      <Titulo
        eyebrow="Equipe"
        titulo="Profissionais"
        detalhe="Escolha seu barbeiro de preferência ou agende no primeiro horário disponível."
      />

      <div className="filter-bar">
        <BuscaVitrine valor={busca} alterar={setBusca} rotulo="Buscar profissionais" />
        {!busca.trim() && !!equipe.dados?.length && (
          <Link to="/agendar?profissional=qualquer" className="btn btn--neutro btn--compacto">
            <UsersRound size={15} /> Qualquer profissional disponível
          </Link>
        )}
      </div>

      <Aviso erro={equipe.erro} />
      {equipe.carregando && <SkeletonCards quantidade={2} />}
      {!equipe.carregando && lista?.length === 0 && <Vazio texto="Nenhum profissional encontrado." />}

      {!!lista?.length && (
        <div className="catalog-grid">
          {lista.map((p, idx) => (
            <Reveal key={p.id} staggerIndex={idx} variant="up">
              <CardProfissionalLista b={p} foto={fotoProfissional(fotos.dados, p, marca?.demonstracao)} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

export function GaleriaPage() {
  const { marca } = useMarca();
  const fotos = useFotos();
  const [categoria, setCategoria] = useState("Todas");
  const [indice, setIndice] = useState<number>();
  const [dirLb, setDirLb] = useState<1 | -1>(1);
  const toque = useRef(0);

  const publicadas = fotos.dados?.filter(f => f.alvo === "GALERIA") ?? [];
  const exemplos = fotos.dados && publicadas.length === 0 && marca?.demonstracao;
  const todas = exemplos ? galeriaDemo : publicadas;
  const categorias = ["Todas", ...new Set(todas.map(f => f.categoria ?? "Outros"))];
  const lista = todas.filter(f => categoria === "Todas" || (f.categoria ?? "Outros") === categoria);
  const ampliada = indice === undefined ? undefined : lista[indice];

  function mover(delta: 1 | -1) {
    setDirLb(delta);
    setIndice(i => ((i ?? 0) + delta + lista.length) % lista.length);
  }

  useEffect(() => {
    if (indice === undefined) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") mover(-1);
      else if (e.key === "ArrowRight") mover(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [indice, lista.length]);

  return (
    <section className="stack">
      <Titulo eyebrow="Referências" titulo="Galeria" detalhe="Cortes, barbas e ambiente do studio." />

      <div className="chip-scroll" role="group" aria-label="Categorias">
        {categorias.map(c => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={c === categoria}
            onClick={() => { setCategoria(c); setIndice(undefined); }}
          >
            {c}
          </button>
        ))}
      </div>

      <Aviso erro={fotos.erro} />
      {fotos.carregando && <SkeletonCards quantidade={4} />}
      {fotos.dados && lista.length === 0 && <Vazio texto="Nenhuma fotografia nesta categoria." />}

      <div className="gallery-grid" key={categoria}>
        {lista.map((f, i) => (
          <Reveal key={f.id} staggerIndex={i} variant="scale">
            <button type="button" className="gallery-tile" onClick={() => setIndice(i)}>
              <FotoEditorial src={f.url} alt={f.legenda ?? "Trabalho do studio"} className="gallery-tile-media" revelar="curtain" />
              {f.legenda && <span className="gallery-tile-caption">{f.legenda}</span>}
            </button>
          </Reveal>
        ))}
      </div>

      {ampliada && (
        <PainelModal titulo={ampliada.legenda || "Galeria"} fechar={() => setIndice(undefined)}>
          <div
            className="gallery-lightbox"
            onTouchStart={e => { toque.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const delta = e.changedTouches[0].clientX - toque.current;
              if (Math.abs(delta) > 45) mover(delta < 0 ? 1 : -1);
            }}
          >
            <div
              key={ampliada.id}
              className="lightbox-frame"
              style={{ "--lb-dx": `${dirLb * 18}px` } as CSSProperties}
            >
              <FotoEditorial src={ampliada.url} alt={ampliada.legenda ?? "Foto ampliada"} className="lightbox-media" prioridade />
            </div>
            <div className="lightbox-nav">
              <button type="button" className="icon-btn" onClick={() => mover(-1)} aria-label="Foto anterior">
                <ChevronLeft size={19} />
              </button>
              <span className="tabular text-secondary" aria-live="polite">
                {(indice ?? 0) + 1} / {lista.length}
              </span>
              <button type="button" className="icon-btn" onClick={() => mover(1)} aria-label="Próxima foto">
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        </PainelModal>
      )}
    </section>
  );
}
