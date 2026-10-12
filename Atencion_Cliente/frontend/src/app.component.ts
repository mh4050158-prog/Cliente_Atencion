import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Mesa { id: number; turno: number | null; }
interface Estado { ultimo_turno: number; cola: number[]; mesas: Mesa[]; }

const API = '/api';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main class="wrap">
      <h1>Atención a Clientes</h1>
      <p class="subtitulo">Sistema de turnos y atención por mesas</p>

      <button class="tomar" [disabled]="cargando" (click)="tomarTurno()">
        {{ cargando ? 'Generando turno...' : 'Tomar turno' }}
      </button>
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      @if (miTurno !== null) {
        <p class="mio">Tu turno: <b>#{{ miTurno }}</b> — {{ mensajeMiTurno() }}</p>
      }

      <h2>Mesas de atención</h2>
      <section class="mesas">
        @for (m of estado.mesas; track m.id) {
          <div class="mesa" [class.ocupada]="m.turno !== null">
            <h3>Mesa {{ m.id }}</h3>
            @if (m.turno !== null) {
              <p class="num">#{{ m.turno }}</p>
              <p class="ocupada-texto">En atención</p>
              <button class="terminar" [disabled]="procesandoMesa === m.id" (click)="liberar(m.id)">
                {{ procesandoMesa === m.id ? 'Actualizando...' : 'Terminar atención' }}
              </button>
            } @else {
              <p class="libre">Libre</p>
            }
          </div>
        }
      </section>

      <h2>Fila de espera ({{ estado.cola.length }})</h2>
      <section class="fila">
        @for (t of estado.cola; track t) {
          <span class="ficha" [class.yo]="t === miTurno">#{{ t }}</span>
        } @empty {
          <span class="vacio">No hay clientes esperando.</span>
        }
      </section>
      <p class="actualizacion">La información se actualiza automáticamente.</p>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background:#f4f7fb; color:#243047; font-family:Arial, sans-serif; }
    .wrap { max-width:900px; margin:0 auto; padding:32px 22px; }
    h1 { margin:0; color:#173b70; font-size:clamp(1.8rem,4vw,2.5rem); }
    .subtitulo { color:#68758a; margin:8px 0 24px; }
    button { border:0; border-radius:8px; padding:10px 14px; font-weight:600; cursor:pointer; }
    button:disabled { opacity:.65; cursor:wait; }
    .tomar { font-size:1.1rem; padding:14px 26px; background:#1769e0; color:white; box-shadow:0 4px 10px #1769e033; }
    .mio { padding:14px 16px; border-radius:10px; background:#e3efff; color:#173b70; }
    .error { padding:12px; border-radius:8px; background:#ffeded; color:#a52222; }
    h2 { margin:30px 0 14px; font-size:1.25rem; }
    .mesas { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; }
    .mesa { background:white; border:2px solid #2e9e5b; border-radius:12px; padding:16px; text-align:center; box-shadow:0 3px 12px #1d35570c; }
    .mesa.ocupada { border-color:#d64545; }
    .mesa h3 { margin:0 0 10px; }
    .num { font-size:2.2rem; font-weight:700; margin:6px 0; }
    .libre { color:#21834a; font-weight:700; }
    .ocupada-texto { color:#bf3434; font-weight:600; margin:5px 0 12px; }
    .terminar { background:#fff0f0; color:#a52222; }
    .fila { display:flex; flex-wrap:wrap; gap:8px; min-height:42px; align-items:center; }
    .ficha { background:white; border:1px solid #c4ccd4; border-radius:18px; padding:7px 14px; }
    .ficha.yo { background:#ffe9a8; border-color:#e0a800; font-weight:700; }
    .vacio { color:#68758a; }
    .actualizacion { color:#788397; font-size:.85rem; margin-top:24px; }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  estado: Estado = { ultimo_turno: 0, cola: [], mesas: [] };
  miTurno: number | null = null;
  cargando = false;
  error = '';
  procesandoMesa: number | null = null;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.cargar();
    this.timer = setInterval(() => this.cargar(), 3000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  cargar() {
    this.http.get<Estado>(`${API}/estado`).subscribe({
      next: e => { this.estado = e; this.error = ''; },
      error: err => {
        console.error('Error al cargar el estado:', err);
        this.error = 'No se pudo conectar con el servidor. Espera un momento y vuelve a intentarlo.';
      }
    });
  }

  tomarTurno() {
    if (this.cargando) return;
    this.cargando = true;
    this.error = '';
    this.http.post<{ turno: number; mesa: number | null }>(`${API}/turnos`, {}).subscribe({
      next: r => {
        this.miTurno = r.turno;
        this.cargando = false;
        this.cargar();
      },
      error: err => {
        console.error('Error al tomar turno:', err);
        this.cargando = false;
        this.error = 'No se pudo generar el turno. Revisa la conexión con el servidor e inténtalo de nuevo.';
      }
    });
  }

  liberar(id: number) {
    this.procesandoMesa = id;
    this.error = '';
    this.http.post<Estado>(`${API}/mesas/${id}/liberar`, {}).subscribe({
      next: e => {
        this.estado = e;
        this.procesandoMesa = null;
      },
      error: err => {
        console.error('Error al liberar mesa:', err);
        this.procesandoMesa = null;
        this.error = 'No se pudo terminar la atención de esta mesa.';
      }
    });
  }

  mensajeMiTurno(): string {
    const mesa = this.estado.mesas.find(m => m.turno === this.miTurno);
    if (mesa) return `pasa a la Mesa ${mesa.id}`;
    const pos = this.estado.cola.indexOf(this.miTurno as number);
    return pos >= 0 ? `en espera (posición ${pos + 1})` : 'atendido';
  }
}
