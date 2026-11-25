"""Testes que complementam a regressão da V2 numa instalação descartável."""
import concurrent.futures
import datetime
import json
import os
import pathlib
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo


BASE = os.environ.get("SOLDADO_TEST_URL", "http://127.0.0.1:8080")
FOTO = pathlib.Path(__file__).resolve().parents[1] / "src/main/frontend/public/capa-demonstracao.jpg"


def req(rota, metodo="GET", token=None, corpo=None, status=200):
    cabecalho = {"Authorization": f"Bearer {token}"} if token else {}
    dados = None
    if corpo is not None:
        cabecalho["Content-Type"] = "application/json"
        dados = json.dumps(corpo).encode()
    try:
        resposta = urllib.request.urlopen(urllib.request.Request(BASE + rota, dados, cabecalho, method=metodo))
    except urllib.error.HTTPError as e:
        resposta = e
    with resposta:
        assert resposta.status == status, (rota, resposta.status, resposta.read())
        if resposta.headers.get("Content-Type", "").startswith("application/json"):
            return json.load(resposta)
        return resposta.read()


def login(usuario, senha):
    return req("/api/login", "POST", corpo={"username": usuario, "senha": senha})["token"]


def upload(token, alvo, categoria=None):
    args = ["curl", "-sS", "-w", "\n%{http_code}", "-H", f"Authorization: Bearer {token}",
            "-F", f"alvo={alvo}", "-F", f"arquivo=@{FOTO}"]
    if categoria is not None:
        args += ["-F", f"categoria={categoria}"]
    corpo, status = subprocess.check_output(args + [BASE + "/api/fotos"]).rsplit(b"\n", 1)
    assert int(status) == 200, corpo
    return json.loads(corpo)


admin = login("admin", "AdminDemo@2026")
cliente = login("cliente", "ClienteDemo@2026")
req("/api/login", "POST", corpo={"username": "admin", "senha": "errada"}, status=401)
req("/api/usuarios", token=cliente, status=403)
req("/api/usuarios", token="token-invalido", status=401)
servico = next(s for s in req("/api/publico/servicos") if s["nome"] == "Corte clássico")
dia = datetime.datetime.now(ZoneInfo("America/Sao_Paulo")).date() + datetime.timedelta(days=2)
params = urllib.parse.urlencode({"data": dia.isoformat(), "servicoId": servico["id"]})
horarios = req("/api/publico/horarios?" + params)
equipe = req("/api/publico/barbeiros")
assert horarios == sorted({h for b in equipe for h in req(f"/api/publico/horarios?{params}&barbeiroId={b['id']}")})
assert req(f"/api/publico/proximos-horarios?servicoId={servico['id']}&aPartir={dia}")[0] == horarios[0]
nova = {"servicoId": servico["id"], "barbeiroId": None, "inicio": horarios[0]}
req("/api/agendamentos", "POST", corpo=nova, status=401)


def simultanea(_):
    try:
        return req("/api/agendamentos", "POST", cliente, nova)
    except AssertionError as e:
        assert e.args[0][1] == 409, e
        return None


with concurrent.futures.ThreadPoolExecutor(2) as pool:
    resultados = list(pool.map(simultanea, range(2)))
assert len([r for r in resultados if r]) == 1
reserva = next(r for r in resultados if r)
assert reserva["barbeiroId"] in {b["id"] for b in equipe}
req("/api/agendamentos/" + str(reserva["id"]), "DELETE", cliente, status=200)

abertura = upload(admin, "ABERTURA")
galeria = upload(admin, "GALERIA", "Barba")
assert galeria["categoria"] == "Barba"
assert abertura in req("/api/publico/fotos")
assert req(abertura["url"]).startswith(b"\xff\xd8")
for rota in ("/inicio", "/catalogo", "/equipe", f"/equipe/{equipe[0]['id']}", "/galeria", "/painel"):
    assert b"<!doctype html>" in req(rota)

print("PASSOU: rotas SPA, login e papéis, disponibilidade agregada, atribuição automática, proteção de duplicidade e metadados de imagens.")
