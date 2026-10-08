"""API de gestión de atención a clientes (FastAPI, estado en memoria)."""
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Atención a Clientes")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NUM_MESAS = 4
lock = Lock()
estado = {
    "ultimo_turno": 0,
    "cola": [],  # turnos esperando
    "mesas": [{"id": i + 1, "turno": None} for i in range(NUM_MESAS)],
}


def asignar_turnos():
    """Asigna turnos de la cola a las mesas libres, en orden."""
    for mesa in estado["mesas"]:
        if mesa["turno"] is None and estado["cola"]:
            mesa["turno"] = estado["cola"].pop(0)


@app.get("/estado")
def obtener_estado():
    with lock:
        return estado


@app.post("/turnos")
def tomar_turno():
    with lock:
        estado["ultimo_turno"] += 1
        turno = estado["ultimo_turno"]
        estado["cola"].append(turno)
        asignar_turnos()
        mesa = next((m["id"] for m in estado["mesas"] if m["turno"] == turno), None)
        return {"turno": turno, "mesa": mesa}


@app.post("/mesas/{mesa_id}/liberar")
def liberar_mesa(mesa_id: int):
    with lock:
        mesa = next((m for m in estado["mesas"] if m["id"] == mesa_id), None)
        if mesa is None:
            raise HTTPException(404, "Mesa no existe")
        if mesa["turno"] is None:
            raise HTTPException(400, "La mesa ya está libre")
        mesa["turno"] = None
        asignar_turnos()
        return estado


@app.post("/reiniciar")
def reiniciar():
    with lock:
        estado["ultimo_turno"] = 0
        estado["cola"].clear()
        for m in estado["mesas"]:
            m["turno"] = None
        return estado
