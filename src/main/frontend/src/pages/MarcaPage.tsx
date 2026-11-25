import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { logoMarca } from "../services/marcaLogo";
import { useConsulta } from "../services/useConsulta";
import { useMarca } from "../components/useMarca";
import { Aviso, Campo, Titulo } from "../components/Interface";
import { fotoDe, useFotos } from "../components/FotosPublicas";
import { FotoEditorial } from "../components/Experiencia";
import { interiorDemo } from "../services/fotosDemo";
import FotosAdmin from "../components/FotosAdmin";
import Botao from "../components/Botao";
import type { Marca, Servico } from "../types/Barbearia";

function FormMarca({ inicial }: { inicial: Marca }) {
  const [marca, setMarca] = useState(inicial);
  const [arquivo, setArquivo] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const anterior = useRef<string>(undefined);
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  const [ocupado, setOcupado] = useState(false);
  const { atualizar } = useMarca();
  const fotos = useFotos();
  const servicos = useConsulta<Servico[]>("/servicos");
  const logoAtual = preview || logoMarca(marca);

  useEffect(() => () => {
    if (anterior.current) URL.revokeObjectURL(anterior.current);
  }, []);

  function escolherLogo(imagem?: File) {
    if (anterior.current) URL.revokeObjectURL(anterior.current);
    anterior.current = imagem ? URL.createObjectURL(imagem) : undefined;
    setArquivo(imagem);
    setPreview(anterior.current);
  }

  function alterar<K extends keyof Marca>(chave: K, valor: Marca[K]) {
    setMarca(m => ({ ...m, [chave]: valor }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setFeedback({});
    try {
      const { data } = await api.put<Marca>("/barbearia", marca);
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

  return (
    <div className="stack">
      <Aviso {...feedback} />

      <div className="surface-card stack-sm">
        <div className="section-head">
          <h2 className="section-title">Logotipo e paleta ativa</h2>
          <div className="swatch-row" aria-hidden="true">
            <span className="swatch-dot" style={{ background: marca.corFundo }} />
            <span className="swatch-dot" style={{ background: marca.corDestaque }} />
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

      <form className="surface-card form-stack" onSubmit={salvar}>
        <div className="stack-xs">
          <h2 className="section-title">Prévia da identidade</h2>
          <div
            className="hero-banner hero-banner--preview"
            style={{ "--accent": marca.corDestaque, "--bg-canvas": marca.corFundo } as CSSProperties}
          >
            <FotoEditorial
              src={fotoDe(fotos.dados, "CAPA")?.url ?? (marca.demonstracao ? interiorDemo : undefined)}
              className="hero-banner-photo"
            />
            <div className="hero-banner-scrim" aria-hidden="true" />
            <div className="hero-banner-content">
              {logoAtual && <img className="auth-logo" src={logoAtual} alt="" />}
              <h3>{marca.nome || "Nome comercial"}</h3>
              {marca.descricao && <p className="text-secondary">{marca.descricao}</p>}
              <span className="btn btn--primario btn--compacto">Agendar agora</span>
            </div>
          </div>
        </div>

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
          <Campo nome="Cor de destaque">
            <input type="color" value={marca.corDestaque} onChange={e => alterar("corDestaque", e.target.value)} />
          </Campo>
          <Campo nome="Cor de fundo">
            <input type="color" value={marca.corFundo} onChange={e => alterar("corFundo", e.target.value)} />
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

        <h2 className="section-title">Programa de fidelidade</h2>
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
          <Botao type="submit" disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar configurações"}</Botao>
        </div>
      </form>

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
    </div>
  );
}

export default function MarcaPage() {
  const { marca, erro } = useMarca();
  return (
    <section className="stack">
      <Titulo eyebrow="Personalização" titulo="Marca e fidelidade" detalhe="Gerencie identidade visual, fotografias e regras da barbearia." />
      {marca ? <FormMarca inicial={marca} /> : <Aviso erro={erro} carregando={!erro} />}
    </section>
  );
}
