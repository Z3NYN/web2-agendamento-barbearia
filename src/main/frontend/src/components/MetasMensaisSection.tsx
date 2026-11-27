import { useState } from "react";
import { Calendar, Edit3, Plus, Target, Trash2 } from "lucide-react";
import { Aviso } from "./Interface";
import api from "../services/api";
import { temPermissao } from "../services/auth";
import { mensagem, moeda } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import type { EntradaMeta, ResumoMetaMensal } from "../types/Painel";

function formatarValorMeta(valor: number, unidade: string): string {
  if (unidade === "BRL") return moeda(valor);
  if (unidade === "PCT") return `${valor.toFixed(1).replace(".", ",")}%`;
  const inteiro = Math.round(valor);
  return `${inteiro.toLocaleString("pt-BR")} ${unidade}`;
}

function rotuloStatusMes(status: ResumoMetaMensal["statusMes"]): string {
  switch (status) {
    case "ENCERRADO":
      return "Mês encerrado";
    case "FUTURO":
      return "Mês futuro";
    default:
      return "Mês em andamento";
  }
}

interface FormState {
  metaAtendimentosConcluidos: string;
  metaValorConcluidos: string;
  metaClientesUnicos: string;
  metaNovosCadastros: string;
  metaOcupacaoPercentual: string;
}

function estadoInicialForm(meta: ResumoMetaMensal): FormState {
  const map = new Map(meta.itens.map((i) => [i.codigo, String(i.meta)]));
  return {
    metaAtendimentosConcluidos: map.get("ATENDIMENTOS") ?? "",
    metaValorConcluidos: map.get("VALOR_CONCLUIDO") ?? "",
    metaClientesUnicos: map.get("CLIENTES_UNICOS") ?? "",
    metaNovosCadastros: map.get("NOVOS_CADASTROS") ?? "",
    metaOcupacaoPercentual: map.get("OCUPACAO") ?? "",
  };
}

export function MetasMensaisSection({
  meta,
  mostrarHistorico = false,
  onAtualizado,
}: {
  meta: ResumoMetaMensal;
  mostrarHistorico?: boolean;
  onAtualizado?: () => void;
}) {
  const podeGerenciar = temPermissao("METAS_GERENCIAR");
  const mesAtualParam = `${meta.ano}-${String(meta.mes).padStart(2, "0")}`;
  const [mesSelecionado, setMesSelecionado] = useState<string>("");
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [sucessoForm, setSucessoForm] = useState("");
  const [form, setForm] = useState<FormState>(() => estadoInicialForm(meta));

  const mesAlvo = mesSelecionado || mesAtualParam;
  const [anoAlvoStr, mesAlvoStr] = mesAlvo.split("-");
  const anoAlvo = Number(anoAlvoStr);
  const mesNumAlvo = Number(mesAlvoStr);
  const usandoOutroMes = Boolean(mesSelecionado && mesSelecionado !== mesAtualParam);

  const consultaMes = useConsulta<ResumoMetaMensal>(
    usandoOutroMes && Number.isFinite(anoAlvo) && Number.isFinite(mesNumAlvo)
      ? `/metas/${anoAlvo}/${mesNumAlvo}`
      : null
  );
  const historico = useConsulta<ResumoMetaMensal[]>(mostrarHistorico ? "/metas" : null);

  const metaExibida = usandoOutroMes && consultaMes.dados ? consultaMes.dados : meta;

  function abrirEdicao(origem: ResumoMetaMensal) {
    setForm(estadoInicialForm(origem));
    setErroForm("");
    setSucessoForm("");
    setConfirmandoExclusao(false);
    setEditando(true);
  }

  function alterarMes(novoMes: string) {
    setMesSelecionado(novoMes === mesAtualParam ? "" : novoMes);
    setEditando(false);
    setConfirmandoExclusao(false);
    setErroForm("");
    setSucessoForm("");
  }

  function validarNumero(
    bruto: string,
    inteiro: boolean,
    nome: string,
    maxPct = false
  ): { ok: boolean; valor: number | null; erro?: string } {
    const limpo = bruto.trim().replace(",", ".");
    if (!limpo) return { ok: true, valor: null };
    const n = Number(limpo);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, valor: null, erro: `${nome} deve ser maior que zero.` };
    }
    if (inteiro && !Number.isInteger(n)) {
      return { ok: false, valor: null, erro: `${nome} deve ser um número inteiro.` };
    }
    if (maxPct && n > 100) {
      return { ok: false, valor: null, erro: `${nome} deve ficar entre 0,1% e 100%.` };
    }
    return { ok: true, valor: n };
  }

  async function salvarMetas(e: React.FormEvent) {
    e.preventDefault();
    setErroForm("");
    setSucessoForm("");

    const vAtend = validarNumero(form.metaAtendimentosConcluidos, true, "Meta de atendimentos");
    const vValor = validarNumero(form.metaValorConcluidos, false, "Meta de faturamento");
    const vClientes = validarNumero(form.metaClientesUnicos, true, "Meta de clientes únicos");
    const vNovos = validarNumero(form.metaNovosCadastros, true, "Meta de novos cadastros");
    const vOcup = validarNumero(form.metaOcupacaoPercentual, false, "Meta de ocupação média", true);

    const erro = [vAtend, vValor, vClientes, vNovos, vOcup].find((v) => !v.ok)?.erro;
    if (erro) {
      setErroForm(erro);
      return;
    }

    const entrada: EntradaMeta = {
      metaAtendimentosConcluidos: vAtend.valor,
      metaValorConcluidos: vValor.valor,
      metaClientesUnicos: vClientes.valor,
      metaNovosCadastros: vNovos.valor,
      metaOcupacaoPercentual: vOcup.valor,
    };

    if (
      entrada.metaAtendimentosConcluidos === null &&
      entrada.metaValorConcluidos === null &&
      entrada.metaClientesUnicos === null &&
      entrada.metaNovosCadastros === null &&
      entrada.metaOcupacaoPercentual === null
    ) {
      setErroForm("Informe pelo menos uma meta mensal válida para salvar.");
      return;
    }

    setSalvando(true);
    try {
      await api.put(`/metas/${metaExibida.ano}/${metaExibida.mes}`, entrada);
      setEditando(false);
      setSucessoForm(`Metas de ${metaExibida.rotuloMes} salvas.`);
      if (usandoOutroMes) consultaMes.recarregar();
      if (mostrarHistorico) historico.recarregar();
      onAtualizado?.();
    } catch (err) {
      setErroForm(mensagem(err));
    } finally {
      setSalvando(false);
    }
  }

  async function removerMetas() {
    setErroForm("");
    setSucessoForm("");
    setSalvando(true);
    try {
      await api.delete(`/metas/${metaExibida.ano}/${metaExibida.mes}`);
      setConfirmandoExclusao(false);
      setEditando(false);
      setSucessoForm(`Metas de ${metaExibida.rotuloMes} removidas.`);
      if (usandoOutroMes) consultaMes.recarregar();
      if (mostrarHistorico) historico.recarregar();
      onAtualizado?.();
    } catch (err) {
      setErroForm(mensagem(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="mgmt-section" aria-label="Metas do mês">
      <div className="mgmt-section-head">
        <div className="insight-head-title">
          <div className="insight-head-row">
            <Target size={16} strokeWidth={1.75} className="accent-icon" aria-hidden="true" />
            <h2>Metas do mês · {metaExibida.rotuloMes}</h2>
          </div>
          <p className="text-secondary">
            {rotuloStatusMes(metaExibida.statusMes)} · {metaExibida.diasOperacionaisDecorridos} de{" "}
            {metaExibida.diasOperacionaisTotais} dias operacionais transcorridos ({metaExibida.diasOperacionaisRestantes} restante(s))
          </p>
        </div>

        <div className="goal-toolbar">
          <label className="goal-month-picker" aria-label="Selecionar mês da meta">
            <Calendar size={14} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="month"
              value={mesAlvo}
              min="2020-01"
              max="2100-12"
              onChange={(e) => e.target.value && alterarMes(e.target.value)}
            />
          </label>

          {podeGerenciar && (
            <button
              type="button"
              className="btn btn--neutro btn--compacto"
              onClick={() => (editando ? setEditando(false) : abrirEdicao(metaExibida))}
            >
              {metaExibida.configurada ? <Edit3 size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
              <span>{editando ? "Fechar edição" : metaExibida.configurada ? "Editar metas" : "Definir metas"}</span>
            </button>
          )}
        </div>
      </div>

      <Aviso erro={erroForm} sucesso={sucessoForm} />

      {editando && podeGerenciar && (
        <form className="surface-card goal-editor" onSubmit={salvarMetas}>
          <div className="section-head">
            <h3>Configurar metas · {metaExibida.rotuloMes}</h3>
            <span className="text-secondary">Campos vazios ficam sem meta</span>
          </div>

          <div className="goal-form-grid">
            <label className="field">
              <span>Atendimentos concluídos</span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="Ex: 120"
                value={form.metaAtendimentosConcluidos}
                onChange={(e) => setForm({ ...form, metaAtendimentosConcluidos: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Faturamento em concluídos (R$)</span>
              <input
                type="number"
                min={0.01}
                step="0.01"
                inputMode="decimal"
                placeholder="Ex: 8500.00"
                value={form.metaValorConcluidos}
                onChange={(e) => setForm({ ...form, metaValorConcluidos: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Clientes únicos atendidos</span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="Ex: 85"
                value={form.metaClientesUnicos}
                onChange={(e) => setForm({ ...form, metaClientesUnicos: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Novos cadastros</span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="Ex: 20"
                value={form.metaNovosCadastros}
                onChange={(e) => setForm({ ...form, metaNovosCadastros: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Ocupação média (%)</span>
              <input
                type="number"
                min={0.1}
                max={100}
                step="0.1"
                inputMode="decimal"
                placeholder="Ex: 70"
                value={form.metaOcupacaoPercentual}
                onChange={(e) => setForm({ ...form, metaOcupacaoPercentual: e.target.value })}
              />
            </label>
          </div>

          <div className="goal-form-actions">
            <div className="goal-form-left">
              <button type="submit" className="btn btn--primario btn--compacto" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar metas"}
              </button>
              <button
                type="button"
                className="btn btn--neutro btn--compacto"
                onClick={() => setEditando(false)}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>

            {metaExibida.configurada && (
              <div className="goal-form-right">
                {!confirmandoExclusao ? (
                  <button
                    type="button"
                    className="btn btn--perigo btn--compacto"
                    onClick={() => setConfirmandoExclusao(true)}
                    disabled={salvando}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Remover metas do mês</span>
                  </button>
                ) : (
                  <div className="goal-delete-confirm">
                    <span>Confirmar remoção?</span>
                    <button type="button" className="btn btn--perigo btn--compacto" onClick={removerMetas} disabled={salvando}>
                      Confirmar
                    </button>
                    <button type="button" className="btn btn--neutro btn--compacto" onClick={() => setConfirmandoExclusao(false)} disabled={salvando}>
                      Manter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {!metaExibida.configurada ? (
        <div className="surface-card goal-empty">
          <p className="goal-empty-title">Nenhuma meta mensal definida para {metaExibida.rotuloMes}.</p>
          <p className="text-secondary">
            O painel não cria metas artificiais. Quando definidas, o sistema acompanha o ritmo real sobre os dias operacionais com expediente aberto.
          </p>
          {podeGerenciar && !editando && (
            <button type="button" className="btn btn--neutro btn--compacto" onClick={() => abrirEdicao(metaExibida)}>
              <Plus size={14} aria-hidden="true" />
              <span>Definir metas de {metaExibida.rotuloMes}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="goal-grid">
          {metaExibida.itens.map((item) => {
            const larguraVisual = Math.max(0, Math.min(100, item.percentualAtingido));
            return (
              <article key={item.codigo} className={`surface-card goal-card ${item.atingida ? "goal-card--achieved" : ""}`}>
                <div className="goal-card-head">
                  <span className="goal-card-label">{item.rotulo}</span>
                  <strong className={`goal-card-pct tabular ${item.atingida ? "goal-card-pct--ok" : ""}`}>
                    {item.percentualAtingido.toFixed(1).replace(".", ",")}%
                  </strong>
                </div>

                <div className="goal-card-values tabular">
                  <strong>{formatarValorMeta(item.atual, item.unidade)}</strong>
                  <span>de {formatarValorMeta(item.meta, item.unidade)}</span>
                </div>

                <div className="goal-track" role="progressbar" aria-valuenow={Math.round(item.percentualAtingido)} aria-valuemin={0} aria-valuemax={100}>
                  <span
                    className={`goal-fill ${item.atingida ? "goal-fill--achieved" : ""}`}
                    style={{ width: `${larguraVisual}%` }}
                  />
                </div>

                <p className="goal-card-note tabular">
                  {item.atingida ? (
                    <span className="goal-done-copy">Meta atingida</span>
                  ) : (
                    <>
                      Faltam {formatarValorMeta(item.restante, item.unidade)}
                      {item.mediaDiariaNecessaria !== null
                        ? ` · Ritmo: ${formatarValorMeta(item.mediaDiariaNecessaria, item.unidade)}/dia`
                        : ""}
                    </>
                  )}
                </p>
                <p className="text-secondary goal-card-obs">{item.observacao}</p>
              </article>
            );
          })}
        </div>
      )}

      {mostrarHistorico && (historico.dados?.length ?? 0) > 0 && (
        <div className="surface-card goal-history">
          <div className="section-head">
            <h3>Histórico mensal preservado</h3>
            <span className="text-secondary">Cada mês mantém sua própria configuração</span>
          </div>
          <div className="goal-history-list">
            {historico.dados?.map((h) => {
              const idMes = `${h.ano}-${String(h.mes).padStart(2, "0")}`;
              const atingidas = h.itens.filter((i) => i.atingida).length;
              return (
                <button
                  key={idMes}
                  type="button"
                  className={`goal-history-chip ${mesAlvo === idMes ? "goal-history-chip--active" : ""}`}
                  onClick={() => alterarMes(idMes)}
                >
                  <strong>{h.rotuloMes}</strong>
                  <span>
                    {atingidas}/{h.itens.length} atingida(s)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
