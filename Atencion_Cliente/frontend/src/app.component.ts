import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Mesa { id: number; turno: number | null; }
interface Estado { ultimo_turno: number; cola: number[]; mesas: Mesa[]; }

const API = 'http://localhost:8000';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main class="wrap">
      <h1>Atención a Clientes</h1>

      <button class="tomar" (click)="tomarTurno()">Tomar turno</button>
      @if (miTurno !== null) {
        <p class="mio">Tu turno: <b>#{{ miTurno }}</b> — {{ mensajeMiTurno() }}</p>
      }

      <h2>Mesas</h2>
      <section class="mesas">
        @for (m of estado.mesas; track m.id) {
          <div class="mesa" [class.ocupada]="m.turno !== null">
            <h3>Mesa {{ m.id }}</h3>
            @if (m.turno !== null) {
              <p class="num">#{{ m.turno }}</p>
              <button (click)="liberar(m.id)">Terminar atención</button>
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
          <span>No hay clientes esperando.</span>
        }
      </section>
    </main>
  `,
  styles: [`
    .wrap { max-width: 800px; margin: 0 auto; padding: 24px; }
    .tomar { font-size: 1.2rem; padding: 14px 28px; background: #1769e0; color: #fff;
             border: 0; border-radius: 8px; cursor: pointer; }
    .mio { font-size: 1.1rem; }
    .mesas { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .mesa { background: #fff; border: 2px solid #2e9e5b; border-radius: 10px; padding: 12px; text-align: center; }
    .mesa.ocupada { border-color: #d64545; }
    .mesa h3 { margin: 0 0 8px; }
    .num { font-size: 2rem; font-weight: 700; margin: 4px 0; }
    .libre { color: #2e9e5b; font-weight: 600; }
    .fila { display: flex; flex-wrap: wrap; gap: 8px; }
    .ficha { background: #fff; border: 1px solid #c4ccd4; border-radius: 16px; padding: 6px 14px; }
    .ficha.yo { background: #ffe9a8; border-color: #e0a800; font-weight: 700; }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  estado: Estado = { ultimo_turno: 0, cola: [], mesas: [] };
  miTurno: number | null = null;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.cargar();
    this.timer = setInterval(() => this.cargar(), 2000);
  }

  ngOnDestroy() { clearInterval(this.timer); }

  cargar() {
    this.http.get<Estado>(`${API}/estado`).subscribe(e => (this.estado = e));
  }

  tomarTurno() {
    this.http.post<{ turno: number }>(`${API}/turnos`, {}).subscribe(r => {
      this.miTurno = r.turno;
      this.cargar();
    });
  }

  liberar(id: number) {
    this.http.post<Estado>(`${API}/mesas/${id}/liberar`, {}).subscribe(e => (this.estado = e));
  }

  mensajeMiTurno(): string {
    const mesa = this.estado.mesas.find(m => m.turno === this.miTurno);
    if (mesa) return `pasa a la Mesa ${mesa.id}`;
    const pos = this.estado.cola.indexOf(this.miTurno as number);
    return pos >= 0 ? `en espera (posición ${pos + 1})` : 'atendido';
  }
}
