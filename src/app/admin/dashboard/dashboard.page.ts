import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
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
  caixaPix = 0;
  caixaDinheiro = 0;
  caixaCartao = 0;

  // Clientes únicos (da collection clientes/) enriquecidos com AOV dos pedidos
  clientesProcessados: { cliente: Cliente; aov: number; ultimaCompra: Date | null; recenciaDias: number }[] = [];

  pedidos$: Observable<Pedido[]> | null = null;
  feedbacks$: Observable<Feedback[]> | null = null;
  carregandoPedidos = true;
  carregandoFeedbacks = true;
  carregandoClientes = true;

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
    ).valueChanges({ idField: 'id' }).pipe(finalize(() => this.carregandoPedidos = false));
    this.feedbacks$ = this.firestore.collection<Feedback>('feedbacks', ref =>
      ref.orderBy('createdAt', 'desc').limit(50)
    ).valueChanges({ idField: 'id' }).pipe(finalize(() => this.carregandoFeedbacks = false));
  }

  carregarStats() {
    // Pedidos: métricas gerais + caixa por modalidade
    this.firestore.collection<Pedido>('pedidos').valueChanges({ idField: 'id' })
      .subscribe((pedidos: Pedido[]) => {
        this.totalVendas = pedidos.length;
        this.receitaTotal = pedidos.reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
        this.vendasMes = pedidos.filter(p => (p.createdAt as any) >= mes).reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        this.ticketMedio = this.totalVendas > 0 ? this.receitaTotal / this.totalVendas : 0;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        this.vendasHoje = pedidos.filter(p => (p.createdAt as any) >= hoje && p.status === 'confirmado').length;

        this.caixaPix = pedidos.filter(p => p.status === 'confirmado' && p.formaPagamento === 'Pix').reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        this.caixaDinheiro = pedidos.filter(p => p.status === 'confirmado' && p.formaPagamento === 'Dinheiro').reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        this.caixaCartao = pedidos.filter(p => p.status === 'confirmado' && p.formaPagamento === 'Cartão').reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        this.caixaHoje = this.caixaPix + this.caixaDinheiro + this.caixaCartao;
      });

    // Clientes: da collection (1 linha por cliente), enriquecido com AOV dos pedidos
    this.firestore.collection<Cliente>('clientes', ref =>
      ref.orderBy('valorTotal', 'desc').limit(100)
    ).valueChanges({ idField: 'telefone' }).pipe(finalize(() => this.carregandoClientes = false)).subscribe((clientes: Cliente[]) => {
      this.firestore.collection<Pedido>('pedidos').valueChanges({ idField: 'id' })
        .subscribe((pedidos: Pedido[]) => {
          this.clientesProcessados = clientes.map(c => {
            const pedidosCli = pedidos.filter(p => p.clienteTelefone === c.telefone);
            const aov = c.totalPedidos && c.totalPedidos > 0
              ? (c.valorTotal || 0) / c.totalPedidos
              : (pedidosCli.reduce((s, p) => s + (p.totalComDesconto || 0), 0) / Math.max(pedidosCli.length, 1));
            const ultima = pedidosCli.length
              ? pedidosCli.map(p => (p.createdAt as any)?.toDate ? (p.createdAt as any).toDate() : new Date(p.createdAt as any))
                          .sort((a, b) => b.getTime() - a.getTime())[0]
              : null;
            const recenciaDias = ultima ? Math.floor((Date.now() - ultima.getTime()) / 86400000) : 999;
            return { cliente: c, aov, ultimaCompra: ultima, recenciaDias };
          });
        });
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
