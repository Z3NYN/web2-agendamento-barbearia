import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { AlvoFoto, Foto } from "../types/Barbearia";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import Botao from "./Botao";
import { Aviso, Campo } from "./Interface";

export default function FotosAdmin({ alvo, cadastroId, alterou }: { alvo: AlvoFoto; cadastroId?: number; alterou?: () => void }) {
  const fotos = useConsulta<Foto[]>("/publico/fotos");
  const [arquivo, setArquivo] = useState<File>();
  const [preview, setPreview] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [legenda, setLegenda] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  const input = useRef<HTMLInputElement>(null);
  const atuais = fotos.dados?.filter(f => f.alvo === alvo && f.cadastroId === (cadastroId ?? null)) ?? [];

  useEffect(() => {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  async function gravar(remover?: Foto) {
    if (!remover && !arquivo) return;
    if (remover && !window.confirm("Remover esta foto?")) return;
    setOcupado(true);
    setFeedback({});
    try {
      if (remover) await api.delete("/fotos/" + remover.id);
      else {
        const dados = new FormData();
        dados.set("arquivo", arquivo!);
        dados.set("alvo", alvo);
        if (cadastroId != null) dados.set("cadastroId", String(cadastroId));
        if (legenda.trim()) dados.set("legenda", legenda.trim());
        if (alvo === "GALERIA") dados.set("categoria", categoria);
        await api.post("/fotos", dados);
        setArquivo(undefined);
        setLegenda("");
        if (input.current) input.current.value = "";
      }
      fotos.recarregar();
      alterou?.();
      setFeedback({ sucesso: remover ? "Foto removida." : "Foto publicada." });
    } catch (e) { setFeedback({ erro: mensagem(e) }); }
    finally { setOcupado(false); }
  }

  return <div className="stack photo-editor">
    <Aviso erro={fotos.erro} carregando={fotos.carregando} />
    <Aviso {...feedback} />
    {atuais.length > 0 && <div className="grid gap-3 sm:grid-cols-3">{atuais.map(f => <div key={f.id} className="stack">
      <img className="photo-preview" src={f.url} alt={f.legenda || "Foto publicada"} />
      <Botao variante="perigo" disabled={ocupado} onClick={() => void gravar(f)}>Remover foto</Botao>
    </div>)}</div>}
    <Campo nome="Imagem PNG ou JPEG de até 2 MB"><input ref={input} type="file" accept="image/png,image/jpeg"
      disabled={ocupado} onChange={e => {
        const f = e.target.files?.[0];
        if (f && f.size > 2097152) {
          setArquivo(undefined);
          setFeedback({ erro: "Selecione uma imagem de até 2 MB." });
          e.target.value = "";
        } else {
          setArquivo(f);
          setFeedback({});
        }
      }} /></Campo>
    {arquivo && preview && <img className="photo-preview" src={preview} alt="Prévia local da imagem" />}
    {alvo === "GALERIA" && <><Campo nome="Categoria da foto"><select value={categoria} onChange={e => setCategoria(e.target.value)}>
      {["Cortes", "Barba", "Ambiente", "Outros"].map(c => <option key={c}>{c}</option>)}
    </select></Campo><Campo nome="Descrição da foto"><input value={legenda} maxLength={120}
      onChange={e => setLegenda(e.target.value)} /></Campo></>}
    <Botao disabled={!arquivo || ocupado} onClick={() => void gravar()}><ImagePlus size={17} />
      {ocupado ? "Aguarde…" : atuais.length > 0 && alvo !== "GALERIA" ? "Substituir foto" : "Publicar foto"}
    </Botao>
  </div>;
}
