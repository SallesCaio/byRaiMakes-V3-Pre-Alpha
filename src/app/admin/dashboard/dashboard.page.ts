import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pedido, PedidoService } from '../../services/pedido.service';
import { Cliente } from '../../services/cliente.service';
import { Feedback } from '../../services/feedback.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  aba: 'visao' | 'pedidos' | 'clientes' | 'feedbacks' | 'caixa' = 'visao';

  totalProdutos = 0;
  totalVendas = 0;
  receitaTotal = 0;
  ticketMedio = 0;
  vendasMes = 0;
  caixaHoje = 0;
  vendasHoje = 0;
  pedidosPorStatus: { status: string; qtd: number }[] = [];

  pedidos$: Observable<Pedido[]> | null = null;
  clientes$: Observable<Cliente[]> | null = null;
  feedbacks$: Observable<Feedback[]> | null = null;

  private authSub?: Subscription;

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private pedidoService: PedidoService,
    private router: Router
  ) {}

  ngOnInit() {
    this.carregarStats();
    this.pedidos$ = this.firestore.collection<Pedido>('pedidos', ref =>
      ref.orderBy('createdAt', 'desc').limit(30)
    ).valueChanges({ idField: 'id' });
    this.clientes$ = this.firestore.collection<Cliente>('clientes', ref =>
      ref.orderBy('valorTotal', 'desc').limit(50)
    ).valueChanges({ idField: 'telefone' });
    this.feedbacks$ = this.firestore.collection<Feedback>('feedbacks', ref =>
      ref.orderBy('createdAt', 'desc').limit(50)
    ).valueChanges({ idField: 'id' });
  }

  carregarStats() {
    this.firestore.collection<Pedido>('pedidos').valueChanges({ idField: 'id' })
      .subscribe((pedidos: Pedido[]) => {
        this.totalVendas = pedidos.length;
        this.receitaTotal = pedidos.reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
        this.vendasMes = pedidos.filter(p => (p.createdAt as any) >= mes).reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        this.ticketMedio = this.totalVendas > 0 ? this.receitaTotal / this.totalVendas : 0;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        this.vendasHoje = pedidos.filter(p => (p.createdAt as any) >= hoje && p.status === 'confirmado').length;
        const contagem: { [k: string]: number } = {};
        pedidos.forEach(p => { contagem[p.status] = (contagem[p.status] || 0) + 1; });
        this.pedidosPorStatus = Object.keys(contagem).map(k => ({ status: k, qtd: contagem[k] }));
      });

    this.firestore.collection('produtos', ref => ref.where('ativo', '==', true))
      .valueChanges().subscribe((p: any[]) => this.totalProdutos = p.length);

    const hojeStr = new Date().toISOString().slice(0, 10);
    this.firestore.doc(`caixa/${hojeStr}`).valueChanges()
      .subscribe((c: any) => this.caixaHoje = c?.total || 0);
  }

  async confirmarVenda(id: string, valor: number) {
    try {
      await this.pedidoService.confirmarVenda(id, valor);
      // recarrega stats (caixa)
      this.carregarStats();
    } catch (e) { console.error(e); alert('Erro ao confirmar venda.'); }
  }

  async logout() {
    await this.afAuth.signOut();
    this.router.navigate(['/admin/login']);
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}
