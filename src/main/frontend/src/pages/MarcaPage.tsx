import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { logoMarca } from "../services/marcaLogo";
import {
  COR_DESTAQUE_PADRAO,
  COR_FUNDO_PADRAO,
  derivarTema,
  ehTemaPadrao,
  normalizarHex,
  validarCorDestaque,
  validarCorFundo,
} from "../theme/themeEngine";
import { useConsulta } from "../services/useConsulta";
import { temPermissao } from "../services/auth";
import { useMarca } from "../components/useMarca";
import { Aviso, Campo, Titulo } from "../components/Interface";
import { fotoDe, useFotos } from "../components/FotosPublicas";
import { FotoEditorial } from "../components/Experiencia";
import { interiorDemo } from "../services/fotosDemo";
import FotosAdmin from "../components/FotosAdmin";
import Botao from "../components/Botao";
import type { Marca, Servico } from "../types/Barbearia";

function FormMarca({ inicial, modo = "completo" }: { inicial: Marca; modo?: "completo" | "fidelidade" }) {
  const [marca, setMarca] = useState(inicial);
  const fundoInicialValido = validarCorFundo(inicial.corFundo).hex ?? COR_FUNDO_PADRAO;
  const destaqueInicialValido = validarCorDestaque(inicial.corDestaque).hex ?? COR_DESTAQUE_PADRAO;

  const [corFundoHex, setCorFundoHex] = useState(
    ehTemaPadrao(inicial.corFundo, inicial.corDestaque) ? COR_FUNDO_PADRAO : fundoInicialValido
  );
  const [corDestaqueHex, setCorDestaqueHex] = useState(
    ehTemaPadrao(inicial.corFundo, inicial.corDestaque) ? COR_DESTAQUE_PADRAO : destaqueInicialValido
  );
  const [fundoPicker, setFundoPicker] = useState(
    ehTemaPadrao(inicial.corFundo, inicial.corDestaque) ? COR_FUNDO_PADRAO : fundoInicialValido
  );
  const [destaquePicker, setDestaquePicker] = useState(
    ehTemaPadrao(inicial.corFundo, inicial.corDestaque) ? COR_DESTAQUE_PADRAO : destaqueInicialValido
  );

  const [arquivo, setArquivo] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const anterior = useRef<string>(undefined);
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  const [feedbackTema, setFeedbackTema] = useState<{ erro?: string; sucesso?: string }>({});
  const [ocupado, setOcupado] = useState(false);
  const [ocupadoTema, setOcupadoTema] = useState(false);

  const { atualizar } = useMarca();
  const podeMarca = temPermissao("MARCA_PERSONALIZAR");
  const podeFidelidade = temPermissao("FIDELIDADE_ADMINISTRAR");
  const podeGaleria = temPermissao("GALERIA_GERENCIAR");
  const fotos = useFotos();
  const servicos = useConsulta<Servico[]>(podeFidelidade ? "/servicos" : null);
  const [feedbackFidelidade, setFeedbackFidelidade] = useState<{ erro?: string; sucesso?: string }>({});
  const [ocupadoFidelidade, setOcupadoFidelidade] = useState(false);
  const logoAtual = preview || logoMarca(marca);

  useEffect(() => () => {
    if (anterior.current) URL.revokeObjectURL(anterior.current);
  }, []);

  const validFundo = useMemo(() => validarCorFundo(corFundoHex), [corFundoHex]);
  const validDestaque = useMemo(() => validarCorDestaque(corDestaqueHex), [corDestaqueHex]);

  const temaPreview = useMemo(
    () => derivarTema(
      validFundo.valida ? validFundo.hex : fundoPicker,
      validDestaque.valida ? validDestaque.hex : destaquePicker
    ),
    [validFundo.valida, validFundo.hex, fundoPicker, validDestaque.valida, validDestaque.hex, destaquePicker]
  );

  const temaJaPadrao =
    temaPreview.fundo === COR_FUNDO_PADRAO && temaPreview.destaque === COR_DESTAQUE_PADRAO &&
    validarCorFundo(inicial.corFundo).hex === COR_FUNDO_PADRAO &&
    validarCorDestaque(inicial.corDestaque).hex === COR_DESTAQUE_PADRAO;

  function escolherLogo(imagem?: File) {
    if (anterior.current) URL.revokeObjectURL(anterior.current);
    anterior.current = imagem ? URL.createObjectURL(imagem) : undefined;
    setArquivo(imagem);
    setPreview(anterior.current);
  }

  function alterar<K extends keyof Marca>(chave: K, valor: Marca[K]) {
    setMarca(m => ({ ...m, [chave]: valor }));
  }

  function aoAlterarFundoTexto(valor: string) {
    setCorFundoHex(valor.toUpperCase());
    setFeedbackTema({});
    const validacao = validarCorFundo(valor);
    if (validacao.valida && validacao.hex) {
      setFundoPicker(validacao.hex);
    }
  }

  function aoAlterarFundoPicker(valor: string) {
    const hex = normalizarHex(valor) ?? COR_FUNDO_PADRAO;
    setCorFundoHex(hex);
    setFeedbackTema({});
    if (validarCorFundo(hex).valida) {
      setFundoPicker(hex);
    }
  }

  function aoAlterarDestaqueTexto(valor: string) {
    setCorDestaqueHex(valor.toUpperCase());
    setFeedbackTema({});
    const validacao = validarCorDestaque(valor);
    if (validacao.valida && validacao.hex) {
      setDestaquePicker(validacao.hex);
    }
  }

  function aoAlterarDestaquePicker(valor: string) {
    const hex = normalizarHex(valor) ?? COR_DESTAQUE_PADRAO;
    setCorDestaqueHex(hex);
    setDestaquePicker(hex);
    setFeedbackTema({});
  }

  async function salvarTema(e: FormEvent) {
    e.preventDefault();
    if (!validFundo.valida || !validFundo.hex) {
      setFeedbackTema({ erro: validFundo.erro });
      return;
    }
    if (!validDestaque.valida || !validDestaque.hex) {
      setFeedbackTema({ erro: validDestaque.erro });
      return;
    }
    setOcupadoTema(true);
    setFeedbackTema({});
    try {
      const { data } = await api.put<Marca>("/barbearia/tema", {
        corFundo: validFundo.hex,
        corDestaque: validDestaque.hex,
      });
      atualizar(data);
      setMarca(m => ({ ...m, corFundo: data.corFundo, corDestaque: data.corDestaque }));
      setCorFundoHex(data.corFundo);
      setCorDestaqueHex(data.corDestaque);
      setFundoPicker(data.corFundo);
      setDestaquePicker(data.corDestaque);
      setFeedbackTema({ sucesso: "Cores do tema atualizadas." });
    } catch (err) {
      setFeedbackTema({ erro: mensagem(err) });
    } finally {
      setOcupadoTema(false);
    }
  }

  async function restaurarTemaPadrao() {
    setOcupadoTema(true);
    setFeedbackTema({});
    try {
      const { data } = await api.put<Marca>("/barbearia/tema", {
        corFundo: COR_FUNDO_PADRAO,
        corDestaque: COR_DESTAQUE_PADRAO,
      });
      atualizar(data);
      setMarca(m => ({ ...m, corFundo: data.corFundo, corDestaque: data.corDestaque }));
      setCorFundoHex(COR_FUNDO_PADRAO);
      setCorDestaqueHex(COR_DESTAQUE_PADRAO);
      setFundoPicker(COR_FUNDO_PADRAO);
      setDestaquePicker(COR_DESTAQUE_PADRAO);
      setFeedbackTema({ sucesso: "Tema padrão restaurado (#111111 e #C5B59B)." });
    } catch (err) {
      setFeedbackTema({ erro: mensagem(err) });
    } finally {
      setOcupadoTema(false);
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setFeedback({});
    try {
      const payload: Marca = {
        ...marca,
        corFundo: validFundo.valida && validFundo.hex ? marca.corFundo : COR_FUNDO_PADRAO,
        corDestaque: validDestaque.valida && validDestaque.hex ? marca.corDestaque : COR_DESTAQUE_PADRAO,
      };
      const { data } = await api.put<Marca>("/barbearia", payload);
      atualizar(data);
      setMarca(data);
      setFeedback({ sucesso: "Configurações atualizadas." });
    } catch (err) {
      setFeedback({ erro: mensagem(err) });
    } finally {
      setOcupado(false);
    }
  }

  async function enviarLogo(remover = false) {
    if (!arquivo && !remover) return;
    setOcupado(true);
    setFeedback({});
    try {
      const form = new FormData();
      if (arquivo) form.append("arquivo", arquivo);
      const { data } = remover ? await api.delete<Marca>("/barbearia/logo") : await api.post<Marca>("/barbearia/logo", form);
      atualizar(data);
      alterar("logo", data.logo);
      escolherLogo();
      setFeedback({ sucesso: remover ? "Logotipo removido." : "Logotipo atualizado." });
    } catch (err) {
      setFeedback({ erro: mensagem(err) });
    } finally {
      setOcupado(false);
    }
  }

  async function salvarFidelidade(e: FormEvent) {
    e.preventDefault();
    setOcupadoFidelidade(true);
    setFeedbackFidelidade({});
    try {
      const { data } = await api.put<Marca>("/barbearia/fidelidade", {
        fidelidadeAtiva: marca.fidelidadeAtiva,
        meta: marca.meta,
        premioId: marca.premioId,
      });
      atualizar(data);
      setMarca(m => ({ ...m, fidelidadeAtiva: data.fidelidadeAtiva, meta: data.meta, premioId: data.premioId, nomePremio: data.nomePremio }));
      setFeedbackFidelidade({ sucesso: "Programa de fidelidade atualizado." });
    } catch (err) {
      setFeedbackFidelidade({ erro: mensagem(err) });
    } finally {
      setOcupadoFidelidade(false);
    }
  }

  return (
    <div className="stack">
      <Aviso {...feedback} />

      {podeMarca && modo === "completo" && (
        <>
          <div className="surface-card stack-sm">
        <div className="section-head">
          <h2 className="section-title">Logotipo da barbearia</h2>
          <div className="swatch-row" aria-hidden="true">
            <span className="swatch-dot" style={{ background: temaPreview.fundo }} />
            <span className="swatch-dot" style={{ background: temaPreview.destaque }} />
            <span className="swatch-dot" style={{ background: temaPreview.cssVars["--accent-primary"] }} />
          </div>
        </div>
        {logoAtual && <img className="logo-preview" src={logoAtual} alt="Prévia do logotipo" />}
        <Campo nome="Arquivo PNG transparente ou JPEG de até 2 MB">
          <input key={marca.logo ?? "sem-logo"} type="file" accept="image/jpeg,image/png" onChange={e => escolherLogo(e.target.files?.[0])} />
        </Campo>
        <div className="inline-actions">
          <Botao onClick={() => void enviarLogo()} disabled={ocupado || !arquivo}>
            <ImagePlus size={16} /> Enviar logotipo
          </Botao>
          {marca.logo && (
            <Botao variante="perigo" onClick={() => void enviarLogo(true)} disabled={ocupado}>
              <Trash2 size={15} /> Remover logotipo
            </Botao>
          )}
        </div>
      </div>

      <form className="surface-card form-stack" onSubmit={salvarTema} noValidate>
        <Aviso {...feedbackTema} />
        <div className="section-head">
          <div>
            <h2 className="section-title">Tema e cores da marca</h2>
            <p className="text-secondary">
              Personalize apenas a paleta visual sem alterar fotos, modo demonstração, fidelidade ou dados comerciais.
            </p>
          </div>
          <span className="theme-preset-tag">
            {temaPreview.ehPadrao ? "Tema padrão" : "Tema personalizado"}
          </span>
        </div>

        <div className="theme-color-grid">
          <div className="theme-color-field">
            <label htmlFor="tema-cor-fundo">Cor de fundo (HEX escuro)</label>
            <div className="theme-hex-row">
              <input
                type="color"
                aria-label="Selecionar cor de fundo"
                className="theme-color-picker"
                value={fundoPicker}
                onChange={e => aoAlterarFundoPicker(e.target.value)}
              />
              <input
                id="tema-cor-fundo"
                type="text"
                maxLength={7}
                spellCheck={false}
                placeholder="#111111"
                className="theme-hex-input"
                aria-invalid={!validFundo.valida}
                value={corFundoHex}
                onChange={e => aoAlterarFundoTexto(e.target.value)}
              />
            </div>
            {validFundo.erro ? (
              <span className="theme-field-error" role="alert">{validFundo.erro}</span>
            ) : (
              <span className="field-hint">
                Padrão: {COR_FUNDO_PADRAO} · Contraste com texto {temaPreview.metricas.contrasteFundoTexto}:1
              </span>
            )}
          </div>

          <div className="theme-color-field">
            <label htmlFor="tema-cor-destaque">Cor de destaque (HEX)</label>
            <div className="theme-hex-row">
              <input
                type="color"
                aria-label="Selecionar cor de destaque"
                className="theme-color-picker"
                value={destaquePicker}
                onChange={e => aoAlterarDestaquePicker(e.target.value)}
              />
              <input
                id="tema-cor-destaque"
                type="text"
                maxLength={7}
                spellCheck={false}
                placeholder="#C5B59B"
                className="theme-hex-input"
                aria-invalid={!validDestaque.valida}
                value={corDestaqueHex}
                onChange={e => aoAlterarDestaqueTexto(e.target.value)}
              />
            </div>
            {validDestaque.erro ? (
              <span className="theme-field-error" role="alert">{validDestaque.erro}</span>
            ) : (
              <span className="field-hint">
                Padrão: {COR_DESTAQUE_PADRAO}
                {temaPreview.metricas.ajustouDestaqueParaContraste
                  ? " · Contraste ajustado automaticamente para botões e rótulos."
                  : ` · Botão primário ${temaPreview.metricas.contrasteBotaoPrimario}:1`}
              </span>
            )}
          </div>
        </div>

        <div className="stack-xs">
          <div className="section-head">
            <h3 className="section-title">Prévia em tempo real</h3>
            <div className="theme-contrast-row" aria-label="Indicadores de contraste">
              <span>Fundo/Texto: {temaPreview.metricas.contrasteFundoTexto}:1</span>
              <span>Botão: {temaPreview.metricas.contrasteBotaoPrimario}:1</span>
              <span>Destaque: {temaPreview.metricas.contrasteDestaqueTexto}:1</span>
            </div>
          </div>

          <div
            className="theme-preview-shell"
            data-testid="theme-live-preview"
            style={temaPreview.cssVars as CSSProperties}
          >
            <div className="hero-banner hero-banner--preview">
              <FotoEditorial
                src={fotoDe(fotos.dados, "CAPA")?.url ?? (marca.demonstracao ? interiorDemo : undefined)}
                className="hero-banner-photo"
              />
              <div className="hero-banner-scrim" aria-hidden="true" />
              <div className="hero-banner-content">
                {logoAtual && <img className="auth-logo" src={logoAtual} alt="" />}
                <span className="eyebrow">Identidade editorial</span>
                <h4 className="hero-banner-title">{marca.nome || "Nome comercial"}</h4>
                {marca.descricao && <p className="text-secondary">{marca.descricao}</p>}
                <div className="inline-actions">
                  <span className="btn btn--primario btn--compacto">Agendar agora</span>
                  <span className="btn btn--neutro btn--compacto">Ver catálogo</span>
                </div>
              </div>
            </div>

            <div className="theme-preview-card">
              <div className="section-head">
                <div className="stack-xs">
                  <span className="eyebrow">Superfície derivada</span>
                  <strong>Corte clássico</strong>
                  <span className="text-secondary">Texto secundário legível sobre superfície elevada.</span>
                </div>
                <span className="option-meta tabular">R$ 45,00</span>
              </div>
              <div className="theme-preview-controls">
                <span className="day-pill is-selected" aria-hidden="true">
                  <span className="day-pill-wk">SEX</span>
                  <strong className="day-pill-num">27</strong>
                </span>
                <span className="chip" aria-pressed="true">10:00</span>
                <span className="chip">10:30</span>
              </div>
            </div>
          </div>
        </div>

        <div className="theme-actions">
          <Botao
            type="submit"
            disabled={ocupadoTema || !validFundo.valida || !validDestaque.valida}
          >
            {ocupadoTema ? "Salvando tema…" : "Salvar cores do tema"}
          </Botao>
          <Botao
            variante="neutro"
            type="button"
            disabled={ocupadoTema || temaJaPadrao}
            onClick={() => void restaurarTemaPadrao()}
          >
            <RotateCcw size={15} /> Restaurar tema padrão
          </Botao>
        </div>
      </form>

      <form className="surface-card form-stack" onSubmit={salvar}>
        <h2 className="section-title">Dados da barbearia</h2>
        <div className="form-grid-2">
          <Campo nome="Nome comercial">
            <input required maxLength={100} value={marca.nome} onChange={e => alterar("nome", e.target.value)} />
          </Campo>
          <Campo nome="Apresentação">
            <input maxLength={220} value={marca.descricao ?? ""} onChange={e => alterar("descricao", e.target.value)} />
          </Campo>
          <Campo nome="Endereço">
            <input maxLength={220} value={marca.endereco ?? ""} onChange={e => alterar("endereco", e.target.value)} />
          </Campo>
          <Campo nome="Telefone comercial">
            <input maxLength={40} type="tel" value={marca.telefone ?? ""} onChange={e => alterar("telefone", e.target.value)} />
          </Campo>
          <Campo nome="WhatsApp com código do país">
            <input
              maxLength={15}
              inputMode="numeric"
              placeholder="Somente números"
              value={marca.whatsapp ?? ""}
              onChange={e => alterar("whatsapp", e.target.value.replace(/\D/g, ""))}
            />
          </Campo>
          <Campo nome="Usuário do Instagram">
            <input
              maxLength={30}
              value={marca.instagram ?? ""}
              onChange={e => alterar("instagram", e.target.value.replace(/^@/, ""))}
            />
          </Campo>
          <Campo nome="Antecedência mínima para cliente alterar (minutos)">
            <input
              type="number"
              min={0}
              max={10080}
              required
              value={marca.antecedenciaMinutos}
              onChange={e => alterar("antecedenciaMinutos", e.target.valueAsNumber || 0)}
            />
          </Campo>
          <label className="check-row">
            <input
              type="checkbox"
              checked={marca.demonstracao}
              onChange={e => alterar("demonstracao", e.target.checked)}
            />
            <span>Modo demonstração</span>
          </label>
        </div>

        <div>
          <Botao type="submit" disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar configurações"}</Botao>
        </div>
      </form>
        </>
      )}

      {podeFidelidade && (
        <form className="surface-card form-stack" onSubmit={salvarFidelidade}>
          <Aviso {...feedbackFidelidade} />
          <div className="section-head">
            <h2 className="section-title">Programa de fidelidade</h2>
            {modo === "fidelidade" && (
              <Link className="btn btn--neutro btn--compacto" to="/clientes">Consultar clientes</Link>
            )}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={marca.fidelidadeAtiva}
              onChange={e => alterar("fidelidadeAtiva", e.target.checked)}
            />
            <span>Habilitar programa de fidelidade</span>
          </label>

          <div className="form-grid-2">
            <Campo nome="Atendimentos para liberar recompensa">
              <input
                type="number"
                min={1}
                max={100}
                required
                value={marca.meta || ""}
                onChange={e => alterar("meta", e.target.valueAsNumber || 0)}
              />
            </Campo>
            <Campo nome="Serviço da recompensa">
              <select
                required={marca.fidelidadeAtiva}
                value={marca.premioId ?? ""}
                onChange={e => alterar("premioId", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selecione um serviço</option>
                {servicos.dados?.filter(s => s.ativo).map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </Campo>
          </div>

          <Aviso erro={servicos.erro} />
          <p className="text-secondary">Defina quais serviços pontuam no menu Serviços.</p>
          <div>
            <Botao type="submit" disabled={ocupadoFidelidade}>{ocupadoFidelidade ? "Salvando…" : "Salvar fidelidade"}</Botao>
          </div>
        </form>
      )}

      {podeGaleria && modo === "completo" && (
        <>
          <section className="surface-card stack-sm">
            <h2 className="section-title">Foto da abertura</h2>
            <FotosAdmin alvo="ABERTURA" />
          </section>
          <section className="surface-card stack-sm">
            <h2 className="section-title">Foto do banner principal</h2>
            <FotosAdmin alvo="CAPA" alterou={fotos.recarregar} />
          </section>
          <section className="surface-card stack-sm">
            <h2 className="section-title">Galeria de trabalhos</h2>
            <FotosAdmin alvo="GALERIA" />
          </section>
        </>
      )}
    </div>
  );
}

export default function MarcaPage({ modo = "completo" }: { modo?: "completo" | "fidelidade" }) {
  const { marca, erro } = useMarca();
  return (
    <section className="stack">
      <Titulo
        eyebrow={modo === "fidelidade" ? "Operação" : "Administração"}
        titulo={modo === "fidelidade" ? "Programa de fidelidade" : "Identidade visual"}
        detalhe={modo === "fidelidade"
          ? "Configure quantos atendimentos liberam recompensa e qual serviço é bonificado."
          : "Gerencie logotipo, paleta do tema, dados comerciais e fotografias da barbearia."}
      />
      {marca ? <FormMarca inicial={marca} modo={modo} /> : <Aviso erro={erro} carregando={!erro} />}
    </section>
  );
}
