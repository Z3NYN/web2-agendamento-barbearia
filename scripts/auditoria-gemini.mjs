import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = "http://localhost:8080";
const out = "target/auditoria-gemini";
await mkdir(out, { recursive: true });

const report = { testes: [], telas: [], erros: [], http: [], escritasBloqueadas: [] };
const browser = await chromium.launch({ headless: true });

async function abrir(width, height) {
    const ctx = await browser.newContext({
        viewport: { width, height },
        locale: "pt-BR"
    });

    await ctx.route("**/api/**", async r => {
        const q = r.request();
        if (!["GET","HEAD","OPTIONS"].includes(q.method()) &&
            !(q.method() === "POST" && new URL(q.url()).pathname === "/api/login")) {
            report.escritasBloqueadas.push(q.url());
            return r.abort();
        }
        await r.continue();
    });

    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    p.on("pageerror", e => report.erros.push(e.message));
    p.on("response", r => {
        if (r.status() >= 400)
            report.http.push({url:r.url(), status:r.status()});
    });
    return p;
}

async function teste(nome, fn) {
    try {
        await fn();
        report.testes.push({nome, resultado:"PASSOU"});
        console.log("PASSOU:", nome);
    } catch(e) {
        report.testes.push({nome, resultado:"FALHOU", erro:e.message});
        console.log("FALHOU:", nome, e.message);
    }
}

async function captura(p, nome) {
    await p.waitForTimeout(1000);
    await p.screenshot({
        path: `${out}/${nome}.png`,
        fullPage:true,
        animations:"disabled"
    });

    const dados = await p.evaluate(() => ({
        largura: innerWidth,
        documento: document.documentElement.scrollWidth,
        textos: document.body.innerText,
        imagensQuebradas: [...document.images]
            .filter(i => i.complete && !i.naturalWidth)
            .map(i => i.src)
    }));

    report.telas.push({nome,url:p.url(),...dados});
    if(dados.documento > dados.largura + 1)
        throw new Error("Overflow horizontal");
    if(dados.imagensQuebradas.length)
        throw new Error("Imagens quebradas");
}

async function visitar(p, rota, nome) {
    const r = await p.goto(base + rota);
    await captura(p, nome);
    if (!r?.ok()) throw new Error("HTTP invalido");
    if (await p.locator("body").innerText() === "")
        throw new Error("Tela vazia");
}

async function login(p, usuario, senha) {
    await p.goto(base + "/login");
    await p.getByLabel("Usuário",{exact:true}).fill(usuario);
    await p.getByLabel("Senha",{exact:true}).fill(senha);
    await p.getByRole("button",{name:"Entrar",exact:true}).click();
    await p.waitForURL(u => u.pathname !== "/login");
}

try {
    const mobile = await abrir(390,844);

    for(const [rota,nome] of [
        ["/","abertura"],
        ["/inicio","home"],
        ["/catalogo","servicos"],
        ["/equipe","profissionais"],
        ["/galeria","galeria"],
        ["/agendar","agendamento"],
        ["/login","login"],
        ["/cadastro","cadastro"]
    ]) {
        await teste(nome, () => visitar(mobile,rota,nome));
    }

    await teste("Login cliente", async () => {
        await login(mobile,"cliente","ClienteDemo@2026");
    });

    for(const [rota,nome] of [
        ["/inicio","home-cliente"],
        ["/fidelidade","fidelidade"],
        ["/perfil","perfil"],
        ["/meus-horarios","meus-horarios"],
        ["/servicos","permissao-cliente"]
    ]) {
        await teste(nome, () => visitar(mobile,rota,nome));
    }

    const admin = await abrir(1440,900);

    await teste("Login administrador", async () => {
        await login(admin,"admin","AdminDemo@2026");
        await captura(admin,"painel-admin");
    });

    for(const rota of [
        "/agenda","/servicos","/profissionais",
        "/clientes","/expediente","/marca",
        "/usuarios","/permissoes"
    ]) {
        await teste("Admin " + rota, () =>
            visitar(admin,rota,"admin-"+rota.slice(1)));
    }

    await teste("Agenda semanal", async () => {
        await admin.goto(base+"/agenda");
        await admin.getByRole("button",{name:/Semanal/}).click();
        await captura(admin,"agenda-semanal");
    });

    const responsivo = await abrir(390,844);

    for(const width of [320,360,390,430,768,1024,1440]) {
        await responsivo.setViewportSize({width,height:900});

        for(const rota of ["/inicio","/catalogo","/agendar"]) {
            await teste(`${width}px ${rota}`, () =>
                visitar(responsivo,rota,`${width}-${rota.slice(1)}`));
        }
    }
} finally {
    await browser.close();
    await writeFile(
        out+"/relatorio.json",
        JSON.stringify(report,null,2),
        "utf8"
    );
    console.log("AUDITORIA FINALIZADA");
}
