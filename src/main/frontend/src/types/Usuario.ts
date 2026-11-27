import type { Permissao } from "./Permissao";

export interface Usuario {
  id: number;
  nome: string;
  username: string;
  email: string;
  ativo: boolean;
  permissoes: Permissao[];
  permissoesEfetivas?: string[];
}
