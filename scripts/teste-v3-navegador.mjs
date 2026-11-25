import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SOLDADO_PLAYWRIGHT ?? "playwright");
const pacote = process.env.SOLDADO_CHROMIUM_PACOTE;
const motor = pacote ? (await import(pacote)).default : null;
const navegador = await chromium.launch({
  executablePath: motor ? await motor.executablePath() : process.env.SOLDADO_CHROMIUM,
  headless: true, args: motor ? [...motor.args, "--no-sandbox"] : ["--no-sandbox"],
});
const baseURL = process.env.SOLDADO_TEST_URL ?? "http://localhost:8080";
const saida = process.env.SOLDADO_EVIDENCIAS ?? "target/evidencias-v3";
const erros = [];
const externas = [];
const respostasFalhas = [];
const foto = fileURLToPath(new URL("../src/main/frontend/public/capa-demonstracao.jpg", import.meta.url));
await mkdir(saida, { recursive: true });

async function abrir(config) {
  const p = await navegador.newPage({ baseURL, locale: "pt-BR", ...config });
  p.setDefaultTimeout(10000);
  p.on("pageerror", e => erros.push(e.message));
  p.on("request", r => { if (r.url().startsWith("http") && !r.url().startsWith(baseURL + "/")) externas.push(r.url()); });
  p.on("response", r => { if (r.status() >= 400 && !r.url().endsWith("/api/login")) respostasFalhas.push(r.url() + " " + r.status()); });
  return p;
}
async function semOverflow(p) {
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow em ${p.url()}`);
}
async function evidenciar(p, nome) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    const imagens = [...document.images].filter(img => img.getBoundingClientRect().top < innerHeight);
    await Promise.allSettled(imagens.map(img => img.decode()));
  });
  await semOverflow(p);
  await p.screenshot({ path: path.join(saida, nome + ".png"), animations: "disabled" });
  if (gravando) await p.waitForTimeout(650);
}
async function entrar(p, usuario, senha) {
  await p.getByLabel("Usuário", { exact: true }).fill(usuario);
  await p.getByLabel("Senha", { exact: true }).fill(senha);
  await p.getByRole("button", { name: "Entrar", exact: true }).click();
}
const continuar = p => p.getByRole("button", { name: "Continuar" }).click();
function dataIso(delta = 0) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", dateStyle: "short" });
  return f.format(new Date(Date.now() + delta));
}
const dia = dataIso(86400000);

let sessaoVideo, quadros = [], gravando = false;
async function gravar(p) {
  if (!process.env.SOLDADO_GRAVAR) return;
  sessaoVideo = await p.context().newCDPSession(p);
  gravando = true;
  sessaoVideo.on("Page.screencastFrame", e => {
    void sessaoVideo.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
    if (gravando) quadros.push({ jpeg: e.data, tempo: e.metadata.timestamp });
  });
  await sessaoVideo.send("Page.startScreencast", { format:"jpeg", quality:80, maxWidth:540, maxHeight:1100 });
}
async function concluirVideo() {
  if (!sessaoVideo) return;
  await sessaoVideo.send("Page.stopScreencast");
  gravando = false;
  if (quadros.length < 5) return;
  const dir = path.join(saida, ".video");
  await mkdir(dir, { recursive: true });
  const lista = [];
  for (let i = 0; i < quadros.length; i++) {
    const f = `frame-${String(i).padStart(4, "0")}.jpg`;
    await writeFile(path.join(dir, f), Buffer.from(quadros[i].jpeg, "base64"));
    const delta = (quadros[i + 1]?.tempo ?? (quadros[i].tempo + 1)) - quadros[i].tempo;
    lista.push(`file '${f}'\nduration ${Math.max(.034, Math.min(1.2, delta || .1)).toFixed(3)}`);
  }
  lista.push(`file 'frame-${String(quadros.length - 1).padStart(4, "0")}.jpg'`);
  await writeFile(path.join(dir, "lista.txt"), lista.join("\n"));
  const ff = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i",
    path.join(dir,"lista.txt"), "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=25", "-c:v", "libx264", "-crf", "22",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(saida,"Demonstracao_V3.mp4")], { encoding: "utf8" });
  if (ff.status !== 0) console.warn("Gravação não exportada:", ff.stderr);
}

try {
  const mobile = await abrir({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await mobile.goto("/");
  await mobile.getByRole("heading", { name: "Seu estilo, no lugar certo." }).waitFor();
  await mobile.locator(".abertura-fundo img").waitFor();
  assert.ok(await mobile.locator(".abertura-fundo img").evaluate(img => img.decode().then(() => img.naturalWidth)));
  await evidenciar(mobile, "01_Abertura_mobile");

  await gravar(mobile);
  await mobile.getByRole("link", { name: "Conhecer o studio" }).tap();
  await mobile.getByRole("heading", { name: "Próximos horários" }).waitFor();
  await mobile.locator(".disponibilidade-home .slot-links a").first().waitFor();
  await evidenciar(mobile, "02_Home_mobile");
  const trilho = mobile.getByRole("region", { name: "serviços", exact: true });
  await trilho.press("ArrowRight");
  await mobile.waitForFunction(() => document.querySelector('[aria-label="serviços"].vitrine-track')?.scrollLeft > 0);
  await mobile.getByRole("searchbox").fill("clássico");
  assert.equal(await trilho.getByRole("link").count(), 1);
  await mobile.getByRole("searchbox").fill("");
  await mobile.goto("/catalogo");
  await mobile.getByRole("link", { name: /Corte clássico/ }).waitFor();
  await evidenciar(mobile, "03_Servicos_mobile");
  await mobile.goto("/equipe");
  await mobile.getByRole("link", { name: /Rafa Demo/ }).tap();
  await mobile.getByRole("heading", { name: "Rafa Demo" }).waitFor();
  await evidenciar(mobile, "04_Profissional_mobile");

  await mobile.getByRole("navigation", { name: "Navegação rápida" }).getByRole("link", { name: "Agendar" }).tap();
  await mobile.getByRole("radio", { name: /Corte clássico/ }).check();
  await continuar(mobile);
  await mobile.getByRole("radio", { name: /Rafa Demo/ }).check();
  await continuar(mobile);
  await mobile.getByRole("button", { name: "Próxima semana" }).click();
  await mobile.getByRole("button", { name: "Semana anterior" }).click();
  await mobile.getByRole("button", { name: "Calendário mensal" }).click();
  await mobile.getByLabel("Data", { exact: true }).fill(dia);
  await mobile.getByRole("radio", { name: "10:00", exact: true }).check();
  await mobile.getByRole("button", { name: "Calendário mensal" }).click();
  await evidenciar(mobile, "05_Agendamento_mobile");
  await continuar(mobile);
  await mobile.getByRole("link", { name: "Entrar para confirmar" }).click();
  await entrar(mobile, "cliente", "senha-incorreta");
  await mobile.getByRole("alert").filter({ hasText: "Usuário ou senha inválidos" }).waitFor();
  await entrar(mobile, "cliente", "ClienteDemo@2026");
  await mobile.getByRole("heading", { name: "Revise sua reserva" }).waitFor();
  await mobile.locator(".booking-summary").getByText("Rafa Demo", { exact: true }).waitFor();
  assert.match(await mobile.locator(".booking-summary").innerText(), /10:00/);
  await evidenciar(mobile, "06_Revisao_apos_login_mobile");
  await mobile.getByRole("button", { name: "Confirmar agendamento" }).click();
  await mobile.getByRole("heading", { name: "Horário reservado" }).waitFor();
  await evidenciar(mobile, "07_Confirmacao_mobile");
  await concluirVideo();

  await mobile.goto("/fidelidade");
  await mobile.getByRole("heading", { name: "9 de 10 concluídos" }).waitFor();
  await evidenciar(mobile, "08_Fidelidade_mobile");
  await mobile.goto("/galeria");
  await mobile.getByRole("button", { name: "Cortes", exact: true }).click();
  assert.equal(await mobile.locator(".gallery-grid .gallery-item").count(), 2);
  await mobile.getByRole("button", { name: "Degradê texturizado" }).click();
  await mobile.getByRole("dialog").waitFor();
  await mobile.getByRole("button", { name: "Próxima foto" }).click();
  await mobile.getByRole("dialog", { name: "Corte e barba" }).waitFor();
  await mobile.getByRole("button", { name: "Fechar", exact: true }).click();
  await evidenciar(mobile, "09_Galeria_mobile");
  await mobile.goto("/perfil");
  await mobile.getByRole("heading", { name: "Próximo atendimento" }).waitFor();
  await mobile.locator(".studio-account").getByText("Corte clássico", { exact: true }).first().waitFor();
  await evidenciar(mobile, "10_Minha_conta_mobile");
  await mobile.goto("/servicos");
  await mobile.getByRole("heading", { name: "Acesso restrito" }).waitFor();

  const desktop = await abrir({ viewport: { width: 1440, height: 900 } });
  await desktop.goto("/login");
  await entrar(desktop, "admin", "AdminDemo@2026");
  await desktop.getByRole("heading", { name: "Visão geral" }).waitFor();
  await desktop.getByText("Profissionais ativos", { exact: true }).waitFor();
  await desktop.locator(".dashboard-linha").getByText(/Corte clássico/).waitFor();
  await evidenciar(desktop, "11_Dashboard_desktop");
  await desktop.goto("/agenda?data=" + dia);
  await desktop.getByRole("heading", { name: "Corte clássico" }).waitFor();
  await evidenciar(desktop, "12_Agenda_desktop");
  await desktop.getByRole("button", { name: "Reagendar" }).click();
  await desktop.getByRole("radio", { name: "12:00", exact: true }).check();
  await desktop.getByRole("button", { name: "Salvar novo horário" }).click();
  await desktop.getByRole("status").filter({ hasText: "Atendimento reagendado" }).waitFor();
  await desktop.getByRole("button", { name: "Cancelar", exact: true }).click();
  await desktop.getByRole("button", { name: "Sim, cancelar" }).click();
  await desktop.locator("article").getByText("Cancelado", { exact: true }).waitFor();
  await desktop.goto("/agenda?data=" + dataIso(-45 * 60000));
  await desktop.getByRole("button", { name: "Concluir atendimento" }).click();
  await desktop.getByRole("status").filter({ hasText: "Atendimento atualizado" }).waitFor();
  await mobile.goto("/fidelidade");
  await mobile.getByRole("link", { name: "Usar recompensa" }).waitFor();
  await evidenciar(mobile, "13_Recompensa_liberada_mobile");

  await desktop.goto("/marca");
  await desktop.getByRole("heading", { name: "Prévia da identidade" }).waitFor();
  await desktop.getByLabel("Nome comercial").fill("Studio Soldado do Corte Demo");
  await desktop.getByRole("button", { name: "Salvar configurações" }).click();
  await desktop.getByRole("status").filter({ hasText: "Configurações atualizadas" }).waitFor();
  await desktop.locator(".brand-preview").scrollIntoViewIfNeeded();
  await evidenciar(desktop, "14_Personalizacao_desktop");
  const galeria = desktop.locator("section").filter({ has: desktop.getByRole("heading", { name: "Galeria de trabalhos" }) });
  await galeria.getByLabel(/Imagem PNG ou JPEG/).setInputFiles(foto);
  await galeria.getByRole("img", { name: "Prévia local da imagem" }).waitFor();
  await galeria.getByLabel("Categoria da foto").selectOption("Ambiente");
  await galeria.getByLabel("Descrição da foto").fill("Foto publicada no teste");
  await galeria.getByRole("button", { name: "Publicar foto" }).click();
  await galeria.getByRole("status").filter({ hasText: "Foto publicada" }).waitFor();
  await mobile.goto("/galeria");
  await mobile.getByRole("button", { name: "Foto publicada no teste" }).waitFor();
  await desktop.goto("/profissionais");
  desktop.on("dialog", d => void d.accept());
  await desktop.getByRole("button", { name: "Novo profissional" }).click();
  await desktop.getByLabel("Nome", { exact: true }).fill("Profissional QA");
  await desktop.getByRole("button", { name: "Salvar", exact: true }).click();
  await desktop.getByRole("searchbox", { name: "Buscar cadastros" }).fill("Profissional QA");
  const profissionalQA = desktop.locator("article").filter({ hasText: "Profissional QA" });
  await profissionalQA.getByRole("button", { name: "Editar" }).click();
  await desktop.getByLabel("Nome", { exact: true }).fill("Profissional Editado QA");
  await desktop.getByRole("button", { name: "Salvar", exact: true }).click();
  await desktop.getByRole("searchbox", { name: "Buscar cadastros" }).fill("Profissional Editado QA");
  const editado = desktop.locator("article").filter({ hasText: "Profissional Editado QA" });
  await editado.getByRole("button", { name: "Desativar" }).click();
  await editado.getByText("Inativo").waitFor();
  await desktop.goto("/inicio");
  await desktop.getByRole("heading", { name: /Olá,/ }).waitFor();
  await evidenciar(desktop, "15_Home_desktop");

  for (const width of [320,360,390,430,768,1024,1440]) {
    await desktop.setViewportSize({ width, height: 900 });
    for (const [rota, titulo] of [["/inicio", /Olá,/], ["/catalogo", "Serviços"], ["/agendar","Nova reserva"], ["/marca","Marca e fidelidade"]]) {
      await desktop.goto(rota);
      await desktop.getByRole("heading", { name: titulo, exact: typeof titulo === "string" }).waitFor();
      await semOverflow(desktop);
    }
  }
  await desktop.emulateMedia({ reducedMotion: "reduce" });
  await desktop.goto("/inicio");
  await desktop.getByRole("heading", { name: /Olá,/ }).waitFor();
  assert.ok(await desktop.locator(".route-view").evaluate(e => Number.parseFloat(getComputedStyle(e).animationDuration) < 0.01));
  assert.deepEqual(erros, []);
  assert.deepEqual(externas, []);
  assert.deepEqual(respostasFalhas, []);
  console.log("PASSOU: Chromium real, 7 larguras, 15 capturas, toque, carrossel, reserva com retorno após login, reagendamento, cancelamento, fidelidade, upload e personalização.");
} finally {
  await navegador.close();
}
