"""Smoke test da V2 contra uma instalação de demonstração descartável."""
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

raiz = pathlib.Path(__file__).resolve().parents[1]
base = os.environ.get("SOLDADO_TEST_URL", "http://127.0.0.1:8080")
foto = raiz / "src/main/frontend/public/capa-demonstracao.jpg"


def req(rota, metodo="GET", token=None, corpo=None, esperado=200):
    headers = {"Authorization": "Bearer " + token} if token else {}
    if corpo is not None:
        headers["Content-Type"] = "application/json"
    data = None if corpo is None else json.dumps(corpo).encode()
    try:
        resposta = urllib.request.urlopen(urllib.request.Request(base + rota, data, headers, method=metodo))
    except urllib.error.HTTPError as erro:
        resposta = erro
    with resposta:
        assert resposta.code == esperado, (rota, resposta.code, resposta.read())
        if resposta.headers.get("Content-Type", "").startswith("application/json"):
            return json.load(resposta)
        return resposta.read()


def login(usuario, senha):
    return req("/api/login", "POST", corpo={"username": usuario, "senha": senha})["token"]


def upload(token, alvo, esperado, cadastro=None, arquivo=foto):
    args = ["curl", "-sS", "-w", "\n%{http_code}", "-H", "Authorization: Bearer " + token,
            "-F", "alvo=" + alvo, "-F", "arquivo=@" + str(arquivo)]
    if cadastro is not None:
        args += ["-F", "cadastroId=" + str(cadastro)]
    corpo, codigo = subprocess.check_output(args + [base + "/api/fotos"]).rsplit(b"\n", 1)
    assert int(codigo) == esperado, (alvo, codigo, corpo)
    return json.loads(corpo)


cliente = login("cliente", "ClienteDemo@2026")
admin = login("admin", "AdminDemo@2026")
assert b"<!doctype html>" in req("/")
assert len(req("/capa-demonstracao.jpg")) > 1000
assert req("/api/publico/expediente")
marca = req("/api/publico/barbearia")
marca.update(instagram="soldado.demo", whatsapp="5562999999999")
req("/api/barbearia", "PUT", admin, marca)
assert req("/api/publico/barbearia")["instagram"] == "soldado.demo"

servico = next(s for s in req("/api/publico/servicos") if s["nome"] == "Corte clássico")
barbeiro = next(b for b in req("/api/publico/barbeiros") if b["nome"] == "Rafa Demo")
upload(cliente, "CAPA", 403)
upload(admin, "CAPA", 400, arquivo=__file__)
capa = upload(admin, "CAPA", 200)
nova_capa = upload(admin, "CAPA", 200)
req(capa["url"], esperado=404)
assert req(nova_capa["url"]).startswith(b"\xff\xd8")
for alvo, cadastro in [("SERVICO", servico["id"]), ("BARBEIRO", barbeiro["id"]), ("GALERIA", None)]:
    publicada = upload(admin, alvo, 200, cadastro)
    assert publicada in req("/api/publico/fotos")
    req("/api/fotos/" + publicada["id"], "DELETE", admin, esperado=204)
    req(publicada["url"], esperado=404)

dia = datetime.datetime.now(ZoneInfo("America/Sao_Paulo")).date() + datetime.timedelta(days=1)
params = urllib.parse.urlencode({"data": dia.isoformat(), "servicoId": servico["id"], "barbeiroId": barbeiro["id"]})
horarios = req("/api/publico/horarios?" + params)
novo = {"servicoId": servico["id"], "barbeiroId": barbeiro["id"], "inicio": horarios[0]}


def reservar():
    tentativa = urllib.request.Request(base + "/api/agendamentos", json.dumps(novo).encode(),
                                       {"Authorization": "Bearer " + cliente, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(tentativa) as resposta:
            return resposta.code, json.load(resposta)
    except urllib.error.HTTPError as erro:
        return erro.code, None


with concurrent.futures.ThreadPoolExecutor(2) as pool:
    resultados = list(pool.map(lambda _: reservar(), range(2)))
assert sorted(c for c, _ in resultados) == [200, 409]
reserva = next(r for c, r in resultados if c == 200)
caminho = "/api/agendamentos/" + str(reserva["id"])
assert req("/api/fidelidade", token=cliente)["progresso"] == 9
req(caminho + "/status", "PUT", cliente, {"status": "CONCLUIDO"}, 403)
req(caminho, "PUT", cliente, {"barbeiroId": barbeiro["id"], "inicio": horarios[-1]})
assert req(caminho, "DELETE", cliente)["status"] == "CANCELADO"
agora = datetime.datetime.now(ZoneInfo("America/Sao_Paulo"))
demo = req("/api/agendamentos?data=" + (agora - datetime.timedelta(minutes=45)).date().isoformat(), token=admin)
concluir = next(a for a in demo if a["status"] == "CONFIRMADO")
status = "/api/agendamentos/" + str(concluir["id"]) + "/status"
req(status, "PUT", admin, {"status": "CONCLUIDO"})
req(status, "PUT", admin, {"status": "CONCLUIDO"}, 409)
cartao = req("/api/fidelidade", token=cliente)
assert cartao["progresso"] == 0
premio = next(m for m in cartao["historico"] if m["tipo"] == "RECOMPENSA")
novo.update(premioId=premio["id"])
resgate = req("/api/agendamentos", "POST", cliente, novo)
assert resgate["preco"] == 0
novo.update(inicio=horarios[-1])
req("/api/agendamentos", "POST", cliente, novo, 409)
print("PASSOU: marca, capa, galeria, fotos de catálogo, permissões, concorrência, reagendamento, cancelamento e fidelidade.")
