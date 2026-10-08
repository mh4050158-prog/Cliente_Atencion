# Atención a Clientes

Gestión de turnos con 4 mesas. Backend: Python (FastAPI). Frontend: Angular 17.

Al pulsar **Tomar turno** se genera un número; si hay una mesa libre se asigna al instante,
si no, pasa a la fila. Al terminar la atención en una mesa, el siguiente turno de la fila se le asigna.

## Backend
```
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Frontend
```
cd frontend
npm install
npm start        # http://localhost:4200
```
