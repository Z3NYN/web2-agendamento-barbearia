import api from "./api";

function base64UrlParaUint8(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function arrayBufferParaB64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function webPushSuportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function possuiInscricaoPush(): Promise<boolean> {
  if (!webPushSuportado()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

export async function assinarWebPush(): Promise<{ ok: boolean; motivo?: "negado" | "indisponivel" }> {
  if (!webPushSuportado()) return { ok: false, motivo: "indisponivel" };
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return { ok: false, motivo: "negado" };

  const reg = (await registrarServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const { data } = await api.get<{ publicKey: string }>("/publico/push-chave");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaUint8(data.publicKey),
    });
  }
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh || arrayBufferParaB64Url(sub.getKey("p256dh"));
  const auth = json.keys?.auth || arrayBufferParaB64Url(sub.getKey("auth"));
  await api.post("/notificacoes/push/inscrever", { endpoint: sub.endpoint, p256dh, auth });
  return { ok: true };
}

export async function limparInscricaoPushLocal(): Promise<void> {
  if (!webPushSuportado()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    /* Ignora falha local do navegador. */
  }
}

export async function sincronizarPushSessao(): Promise<void> {
  if (!webPushSuportado()) return;
  try {
    const { data } = await api.get<{ notifPush: boolean }>("/notificacoes/preferencias");
    if (!data.notifPush) {
      await limparInscricaoPushLocal();
    }
  } catch {
    /* Mantém fluxo de login resiliente caso preferências não carreguem. */
  }
}

export async function cancelarWebPush(): Promise<void> {
  if (!webPushSuportado()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api.post("/notificacoes/push/remover", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    } else {
      await api.post("/notificacoes/push/remover", {});
    }
  } catch {
    /* Mantém operação resiliente caso o serviço de push local não responda. */
  }
}
