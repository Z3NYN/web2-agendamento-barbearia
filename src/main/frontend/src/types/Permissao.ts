export interface Permissao {
  id: number;
  nome: string;
  titulo?: string;
  descricao: string;
  categoria?: string;
  tipo?: "PERFIL" | "PERMISSAO" | string;
  sistema?: boolean;
}
