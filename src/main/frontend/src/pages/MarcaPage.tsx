import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import api from "../services/api";
import { mensagem } from "../services/formato";
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
    setOcupado(true); setFeedback({});
    try {
      const { data } = await api.put<Marca>("/barbearia", marca);
      atualizar(data); setMarca(data); setFeedback({ sucesso: "Configurações atualizadas." });
    } catch (e) { setFeedback({ erro: mensagem(e) }); }
    finally { setOcupado(false); }
  }
  async function logo(remover = false) {
    if (!arquivo && !remover) return;
    setOcupado(true); setFeedback({});
    try {
      const form = new FormData();
      if (arquivo) form.append("arquivo", arquivo);
      const { data } = remover ? await api.delete<Marca>("/barbearia/logo") : await api.post<Marca>("/barbearia/logo", form);
      atualizar(data); alterar("logo", data.logo); escolherLogo();
      setFeedback({ sucesso: remover ? "Logotipo removido." : "Logotipo atualizado." });
    } catch (e) { setFeedback({ erro: mensagem(e) }); }
    finally { setOcupado(false); }
  }

  return <div className="stack">
    <Aviso {...feedback} />
    <div className="panel stack">
      <h2>Logotipo</h2>
      {(preview || marca.logo) && <img className="logo-preview" src={preview || marca.logo || undefined} alt="Prévia do logotipo" />}
      <Campo nome="Arquivo PNG ou JPEG de até 2 MB"><input key={marca.logo} type="file" accept="image/jpeg,image/png"
        onChange={e => escolherLogo(e.target.files?.[0])} /></Campo>
      <div className="flex flex-wrap gap-2"><Botao onClick={() => void logo()} disabled={ocupado || !arquivo}><ImagePlus size={18} /> Enviar imagem</Botao>
        {marca.logo && <Botao variante="perigo" onClick={() => void logo(true)} disabled={ocupado}>Remover logotipo</Botao>}</div>
    </div>
    <form className="panel form-stack" onSubmit={salvar}>
      <div className="stack"><h2>Prévia da identidade</h2>
        <div className="studio-banner brand-preview" style={{ "--gold": marca.corDestaque, "--base": marca.corFundo } as CSSProperties}>
          <FotoEditorial src={fotoDe(fotos.dados, "CAPA")?.url ?? (marca.demonstracao ? interiorDemo : undefined)} />
          <div>{(preview || marca.logo) && <img className="auth-logo" src={preview ?? marca.logo ?? undefined} alt="" />}
            <h3>{marca.nome || "Nome comercial"}</h3>{marca.descricao && <p>{marca.descricao}</p>}
            <span className="button button--primario">Agendar agora</span>
          </div>
        </div>
      </div>
      <h2>Dados da barbearia</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nome="Nome comercial"><input required maxLength={100} value={marca.nome} onChange={e => alterar("nome", e.target.value)} /></Campo>
        <Campo nome="Apresentação"><input maxLength={220} value={marca.descricao ?? ""} onChange={e => alterar("descricao", e.target.value)} /></Campo>
        <Campo nome="Endereço"><input maxLength={220} value={marca.endereco ?? ""} onChange={e => alterar("endereco", e.target.value)} /></Campo>
        <Campo nome="Telefone comercial"><input maxLength={40} type="tel" value={marca.telefone ?? ""} onChange={e => alterar("telefone", e.target.value)} /></Campo>
        <Campo nome="WhatsApp com código do país"><input maxLength={15} inputMode="numeric" placeholder="Somente números"
          value={marca.whatsapp ?? ""} onChange={e => alterar("whatsapp", e.target.value.replace(/\D/g, ""))} /></Campo>
        <Campo nome="Usuário do Instagram"><input maxLength={30} value={marca.instagram ?? ""}
          onChange={e => alterar("instagram", e.target.value.replace(/^@/, ""))} /></Campo>
        <Campo nome="Cor de destaque"><input type="color" value={marca.corDestaque} onChange={e => alterar("corDestaque", e.target.value)} /></Campo>
        <Campo nome="Cor de fundo"><input type="color" value={marca.corFundo} onChange={e => alterar("corFundo", e.target.value)} /></Campo>
        <Campo nome="Prazo do cliente para alterar reserva (minutos)"><input type="number" min={0} max={10080} required
          value={marca.antecedenciaMinutos} onChange={e => alterar("antecedenciaMinutos", e.target.valueAsNumber || 0)} /></Campo>
        <label className="check-field"><input type="checkbox" checked={marca.demonstracao}
          onChange={e => alterar("demonstracao", e.target.checked)} /> Identificar dados como demonstração</label>
      </div>
      <h2>Programa de fidelidade</h2>
      <label className="check-field"><input type="checkbox" checked={marca.fidelidadeAtiva}
        onChange={e => alterar("fidelidadeAtiva", e.target.checked)} /> Habilitar programa</label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nome="Atendimentos para liberar uma recompensa"><input type="number" min={1} max={100} required
          value={marca.meta || ""} onChange={e => alterar("meta", e.target.valueAsNumber || 0)} /></Campo>
        <Campo nome="Serviço da recompensa"><select required={marca.fidelidadeAtiva} value={marca.premioId ?? ""}
          onChange={e => alterar("premioId", e.target.value ? Number(e.target.value) : null)}>
          <option value="">Selecione um serviço</option>
          {servicos.dados?.filter(s => s.ativo).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></Campo>
      </div>
      <Aviso erro={servicos.erro} /><p className="muted">Defina quais serviços geram créditos no menu Serviços.</p>
      <Botao type="submit" disabled={ocupado}>Salvar configurações</Botao>
    </form>
    <section className="panel stack"><h2>Foto da abertura</h2><FotosAdmin alvo="ABERTURA" /></section>
    <section className="panel stack"><h2>Foto da capa</h2><FotosAdmin alvo="CAPA" alterou={fotos.recarregar} /></section>
    <section className="panel stack"><h2>Galeria de trabalhos</h2><FotosAdmin alvo="GALERIA" /></section>
  </div>;
}

export default function MarcaPage() {
  const { marca, erro } = useMarca();
  return <><Titulo titulo="Marca e fidelidade" detalhe="Personalize esta instalação da barbearia." />
    {marca ? <FormMarca inicial={marca} /> : <Aviso erro={erro} carregando={!erro} />}</>;
}
