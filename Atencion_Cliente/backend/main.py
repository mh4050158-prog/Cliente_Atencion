"""API de gestión de atención a clientes (FastAPI)."""
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Atención a Clientes")

# En producción, la interfaz y la API se sirven desde el mismo dominio.
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
    "cola": [],
    "mesas": [{"id": i + 1, "turno": None} for i in range(NUM_MESAS)],
}


def asignar_turnos():
    """Asigna los turnos en espera a las mesas libres, en orden."""
    for mesa in estado["mesas"]:
        if mesa["turno"] is None and estado["cola"]:
            mesa["turno"] = estado["cola"].pop(0)


@app.get("/api/estado")
def obtener_estado():
    with lock:
        return estado


@app.post("/api/turnos")
def tomar_turno():
    with lock:
        estado["ultimo_turno"] += 1
        turno = estado["ultimo_turno"]
        estado["cola"].append(turno)
        asignar_turnos()
        mesa = next((m["id"] for m in estado["mesas"] if m["turno"] == turno), None)
        return {"turno": turno, "mesa": mesa}


@app.post("/api/mesas/{mesa_id}/liberar")
def liberar_mesa(mesa_id: int):
    with lock:
        mesa = next((m for m in estado["mesas"] if m["id"] == mesa_id), None)
        if mesa is None:
            raise HTTPException(status_code=404, detail="Mesa no existe")
        if mesa["turno"] is None:
            raise HTTPException(status_code=400, detail="La mesa ya está libre")
        mesa["turno"] = None
        asignar_turnos()
        return estado


@app.post("/api/reiniciar")
def reiniciar():
    with lock:
        estado["ultimo_turno"] = 0
        estado["cola"].clear()
        for mesa in estado["mesas"]:
            mesa["turno"] = None
        return estado
