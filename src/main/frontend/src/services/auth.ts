// src/services/auth.ts
const TOKEN = "token";
const USUARIO = "usuario";

export interface Sessao {
  token: string;
  nome: string;
  permissoes: string[];
  permissoesEfetivas?: string[];
}

export const PERMISSOES_GESTAO = [
  "DASHBOARD_ANALITICO",
  "METAS_GERENCIAR",
  "AGENDAMENTOS_CONSULTAR",
  "AGENDAMENTOS_GERENCIAR",
  "AGENDAMENTOS_CONFIRMAR_CONCLUIR",
  "CLIENTES_GERENCIAR",
  "FIDELIDADE_ADMINISTRAR",
  "SERVICOS_GERENCIAR",
  "PROFISSIONAIS_GERENCIAR",
  "DISPONIBILIDADE_GERENCIAR",
  "MARCA_PERSONALIZAR",
  "GALERIA_GERENCIAR",
  "USUARIOS_GERENCIAR",
  "PERMISSOES_GERENCIAR",
  "ACESSOS_ATRIBUIR",
] as const;

export const ROTAS_CAPACIDADES: ReadonlyArray<{ rota: string; caps: string[] }> = [
  { rota: "/painel", caps: ["DASHBOARD_ANALITICO"] },
  { rota: "/desempenho", caps: ["DASHBOARD_ANALITICO"] },
  { rota: "/agenda", caps: ["AGENDAMENTOS_CONSULTAR", "AGENDAMENTOS_GERENCIAR", "AGENDAMENTOS_CONFIRMAR_CONCLUIR"] },
  { rota: "/clientes", caps: ["CLIENTES_GERENCIAR", "FIDELIDADE_ADMINISTRAR"] },
  { rota: "/servicos", caps: ["SERVICOS_GERENCIAR"] },
  { rota: "/profissionais", caps: ["PROFISSIONAIS_GERENCIAR"] },
  { rota: "/expediente", caps: ["DISPONIBILIDADE_GERENCIAR"] },
  { rota: "/fidelidade-programa", caps: ["FIDELIDADE_ADMINISTRAR"] },
  { rota: "/marca", caps: ["MARCA_PERSONALIZAR", "GALERIA_GERENCIAR"] },
  { rota: "/usuarios", caps: ["USUARIOS_GERENCIAR"] },
  { rota: "/permissoes", caps: ["PERMISSOES_GERENCIAR"] },
  { rota: "/atribuir-permissoes", caps: ["ACESSOS_ATRIBUIR"] },
];

export function salvarSessao(sessao: Sessao) {
  sessionStorage.setItem(TOKEN, sessao.token);
  sessionStorage.setItem(USUARIO, JSON.stringify(sessao));
}

export function obterToken(): string | null {
  return sessionStorage.getItem(TOKEN);
}

export function obterSessao(): Sessao | null {
  const usuario = sessionStorage.getItem(USUARIO);
  if (!usuario) return null;

  try {
    return JSON.parse(usuario) as Sessao;
  } catch {
    return null;
  }
}

export function permissoesEfetivas(sessao: Sessao | null = obterSessao()): string[] {
  if (!sessao) return [];
  if (Array.isArray(sessao.permissoesEfetivas) && sessao.permissoesEfetivas.length > 0) {
    return sessao.permissoesEfetivas;
  }
  if (sessao.permissoes.includes("ADMIN")) {
    return ["ADMIN", ...PERMISSOES_GESTAO];
  }
  return sessao.permissoes;
}

export function temPapel(papel: string): boolean {
  const sessao = obterSessao();
  return sessao ? sessao.permissoes.includes(papel) : false;
}

export function temPermissao(codigo: string): boolean {
  return permissoesEfetivas().includes(codigo);
}

export function temAlgumaPermissao(...codigos: string[]): boolean {
  const efetivas = permissoesEfetivas();
  return codigos.some(c => efetivas.includes(c));
}

export function temAcessoGestao(): boolean {
  return temAlgumaPermissao(...PERMISSOES_GESTAO);
}

export function rotaPadraoSessao(sessao: Sessao | null = obterSessao()): string {
  if (!sessao) return "/inicio";
  const efetivas = permissoesEfetivas(sessao);
  if (efetivas.includes("ADMIN") || efetivas.includes("DASHBOARD_ANALITICO")) {
    return "/painel";
  }
  if (
    sessao.permissoes.includes("BARBEIRO")
    || efetivas.includes("AGENDAMENTOS_CONSULTAR")
    || efetivas.includes("AGENDAMENTOS_GERENCIAR")
    || efetivas.includes("AGENDAMENTOS_CONFIRMAR_CONCLUIR")
  ) {
    return "/agenda";
  }
  if (sessao.permissoes.includes("CLIENTE")) {
    return "/inicio";
  }
  const primeiraGestao = ROTAS_CAPACIDADES.find(item => item.caps.some(c => efetivas.includes(c)));
  return primeiraGestao ? primeiraGestao.rota : "/inicio";
}

export function sair() {
  sessionStorage.removeItem(TOKEN);
  sessionStorage.removeItem(USUARIO);
}
