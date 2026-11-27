import axios from "axios";
import { obterToken, sair } from "./auth";
import { limparInscricaoPushLocal } from "./pwa";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = obterToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const url: string = erro?.config?.url ?? "";
    // 401 em /login é credencial errada, não sessão expirada.
    if (erro?.response?.status === 401 && !url.includes("/login")) {
      void limparInscricaoPushLocal();
      sair();
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(erro);
  }
);

export default api;