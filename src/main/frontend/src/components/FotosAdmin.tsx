import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import type { AlvoFoto, Foto } from "../types/Barbearia";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import Botao from "./Botao";
import { Aviso, Campo } from "./Interface";

export default function FotosAdmin({
  alvo,
  cadastroId,
  alterou,
}: {
  alvo: AlvoFoto;
  cadastroId?: number;
  alterou?: () => void;
}) {
  const fotos = useConsulta<Foto[]>("/publico/fotos");
  const [arquivo, setArquivo] = useState<File>();
  const [preview, setPreview] = useState("");
  const previewAnterior = useRef<string | undefined>(undefined);
  const [categoria, setCategoria] = useState("Outros");
  const [legenda, setLegenda] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  const input = useRef<HTMLInputElement>(null);
  const atuais = fotos.dados?.filter(f => f.alvo === alvo && f.cadastroId === (cadastroId ?? null)) ?? [];

  useEffect(() => () => {
    if (previewAnterior.current) URL.revokeObjectURL(previewAnterior.current);
  }, []);

  function definirArquivo(imagem?: File) {
    if (previewAnterior.current) URL.revokeObjectURL(previewAnterior.current);
    const novaUrl = imagem ? URL.createObjectURL(imagem) : undefined;
    previewAnterior.current = novaUrl;
    setArquivo(imagem);
    setPreview(novaUrl ?? "");
  }

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
        definirArquivo(undefined);
        setLegenda("");
        if (input.current) input.current.value = "";
      }
      fotos.recarregar();
      alterou?.();
      setFeedback({ sucesso: remover ? "Foto removida." : "Foto publicada." });
    } catch (e) {
      setFeedback({ erro: mensagem(e) });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="stack-sm photo-editor">
      <Aviso erro={fotos.erro} carregando={fotos.carregando} />
      <Aviso {...feedback} />
      {atuais.length > 0 && (
        <div className="photo-admin-grid">
          {atuais.map(f => (
            <div key={f.id} className="photo-admin-item">
              <img className="photo-preview" src={f.url} alt={f.legenda || "Foto publicada"} />
              <Botao variante="perigo" compacto disabled={ocupado} onClick={() => void gravar(f)}>
                <Trash2 size={14} /> Remover
              </Botao>
            </div>
          ))}
        </div>
      )}
      <Campo nome="Imagem PNG ou JPEG de até 2 MB">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          disabled={ocupado}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f && f.size > 2097152) {
              definirArquivo(undefined);
              setFeedback({ erro: "Selecione uma imagem de até 2 MB." });
              e.target.value = "";
            } else {
              definirArquivo(f);
              setFeedback({});
            }
          }}
        />
      </Campo>
      {arquivo && preview && <img className="photo-preview" src={preview} alt="Prévia local da imagem" />}
      {alvo === "GALERIA" && (
        <div className="form-grid-2">
          <Campo nome="Categoria da foto">
            <select value={categoria} onChange={e => setCategoria(e.target.value)}>
              {["Cortes", "Barba", "Ambiente", "Outros"].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Campo>
          <Campo nome="Legenda">
            <input value={legenda} maxLength={120} onChange={e => setLegenda(e.target.value)} />
          </Campo>
        </div>
      )}
      <div>
        <Botao disabled={!arquivo || ocupado} onClick={() => void gravar()}>
          <ImagePlus size={16} />
          {ocupado ? "Publicando…" : atuais.length > 0 && alvo !== "GALERIA" ? "Substituir foto" : "Publicar foto"}
        </Botao>
      </div>
    </div>
  );
}
