import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Pedido, PedidoService } from '../../services/pedido.service';
import { Cliente } from '../../services/cliente.service';
import { Feedback } from '../../services/feedback.service';
import { Produto } from '../../services/firebase.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  aba: 'visao' | 'operacao' | 'catalogo' | 'feedbacks' = 'visao';
  subAba: 'pedidos' | 'caixa' = 'pedidos';
  subCatalogo: 'produtos' | 'banners' = 'produtos';

  // Visão geral
  totalProdutos = 0;
  totalVendas = 0;
  receitaTotal = 0;
  ticketMedio = 0;
  vendasMes = 0;
  vendasHoje = 0;
  caixaHoje = 0;
  caixaPix = 0;
  caixaDinheiro = 0;
  caixaCartao = 0;
  pedidosPendentes = 0;
  pedidosConfirmados = 0;
  pedidosCancelados = 0;
  clientesNovos = 0;
  clientesRecorrentes = 0;
  descontosConcedidos = 0;
  maiorVenda = 0;
  notaMedia = 0;

  // Produtos
  produtosAtivos = 0;
  estoqueBaixo = 0;
  semEstoque = 0;
  produtoMaisVendido = '';
  categoriaMaisVendida = '';

  // Clientes (enriquecidos)
  totalClientes = 0;
  maiorClienteValor = '';
  maiorClienteQtd = '';
  clientesProcessados: { cliente: Cliente; aov: number; ultimaCompra: Date | null; recenciaDias: number }[] = [];

  // Pedidos (lista + paginação)
  pedidos$: Observable<Pedido[]> | null = null;
  todosPedidos: Pedido[] = [];
  pagina = 1;
  readonly porPagina = 20;
  feedbacks$: Observable<Feedback[]> | null = null;
  carregandoPedidos = true;
  carregandoFeedbacks = true;
  carregandoClientes = true;

  private authSub?: Subscription;
  private subs: Subscription = new Subscription();

  // Modal de ação (cancelar/estornar)
  acaoPedido: any = null;
  acaoTitulo = '';
  acaoMensagem = '';
  acaoExecutando = false;
  private acaoTipo: 'cancelar' | 'estornar' = 'cancelar';

  // Modal confirmar venda
  confirmarPedidoAlvo: any = null;
  confirmarTitulo = '';
  confirmarMensagem = '';
  confirmando = false;

  // caches (evita queries aninhadas)
  private pedidosCache: Pedido[] = [];
  private clientesCache: Cliente[] = [];
  private produtosCache: Produto[] = [];

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
    ).valueChanges({ idField: 'id' }).pipe(
      tap(() => this.carregandoPedidos = false),
      tap((p: Pedido[]) => { this.todosPedidos = p; })
    );
    this.feedbacks$ = this.firestore.collection<Feedback>('feedbacks', ref =>
      ref.orderBy('createdAt', 'desc').limit(50)
    ).valueChanges({ idField: 'id' }).pipe(tap(() => this.carregandoFeedbacks = false));
  }

  // Todos os listeners controlados em this.subs; nada de aninhamento; nada recriado após ações
  carregarStats() {
    // Pedidos (1 stream) -> alimenta pedidosCache + todas as métricas derivadas
    this.subs.add(
      this.firestore.collection<Pedido>('pedidos').valueChanges({ idField: 'id' })
      .subscribe((pedidos: Pedido[]) => {

        console.log('[dashboard] pedidos recebidos:', {
          quantidade: pedidos.length,
          confirmados: pedidos.filter(p => p.status === 'confirmado').length,
          pedidos
        });

        this.pedidosCache = pedidos;

        this.recalcPedidos(pedidos);

        console.log('[dashboard] métricas após recalc:', {
          vendasHoje: this.vendasHoje,
          vendasMes: this.vendasMes,
          receitaTotal: this.receitaTotal,
          pedidosConfirmados: this.pedidosConfirmados
        });

        this.recalcProdutosMaisVendidos(pedidos);
        this.recalcClientes();
      })
    );

    // Clientes (1 stream) -> clientesCache + enriquecimento (consome pedidosCache)
    this.subs.add(
      this.firestore.collection<Cliente>('clientes', ref =>
        ref.orderBy('valorTotal', 'desc').limit(100)
      ).valueChanges({ idField: 'telefone' }).pipe(tap(() => this.carregandoClientes = false))
        .subscribe((clientes: Cliente[]) => {
          this.clientesCache = clientes;
          this.recalcClientes();
        })
    );

    // Produtos (1 stream) -> produtosCache + contagens
    this.subs.add(
      this.firestore.collection<Produto>('produtos', ref => ref.where('ativo', '==', true))
        .valueChanges().subscribe((p: Produto[]) => {
          this.produtosCache = p;
          this.recalcProdutos(p);
        })
    );

    // Feedbacks (1 stream)
    this.subs.add(
      this.firestore.collection<Feedback>('feedbacks').valueChanges()
        .subscribe((fs: Feedback[]) => {
          this.notaMedia = fs.length ? fs.reduce((s, f) => s + (f.nota || 0), 0) / fs.length : 0;
        })
    );

    // Caixa do dia (1 stream)
    const hojeStr = new Date().toISOString().slice(0, 10);
    this.subs.add(
      this.firestore.doc(`caixa/${hojeStr}`).valueChanges()
        .subscribe((c: any) => this.caixaHoje = c?.total || 0)
    );
  }

  private recalcPedidos(pedidos: Pedido[]) {
    const confirmados = pedidos.filter(p => p.status === 'confirmado');
    console.log('[dashboard] pedidos confirmados para cálculo:',
      confirmados.map(p => ({
        id: p.id,
        status: p.status,
        createdAt: p.createdAt,
        createdAtConvertido: this.toDateUnsafe(p),
        totalComDesconto: p.totalComDesconto
      }))
    );    
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
    this.totalVendas = pedidos.length;
    this.receitaTotal = confirmados.reduce((s, p) => s + (p.totalComDesconto || 0), 0);
    this.vendasMes = confirmados.filter(p => this.toDateUnsafe(p) >= mes).reduce((s, p) => s + (p.totalComDesconto || 0), 0);
    this.vendasHoje = confirmados.filter(p => this.toDateUnsafe(p) >= hoje).reduce((s, p) => s + (p.totalComDesconto || 0), 0);
    console.log('[dashboard] resultado receita:', {
      hoje: this.vendasHoje,
      mes: this.vendasMes,
      total: this.receitaTotal
    });    
    this.pedidosPendentes = pedidos.filter(p => p.status !== 'confirmado' && p.status !== 'cancelado').length;
    this.pedidosConfirmados = confirmados.length;
    this.pedidosCancelados = pedidos.filter(p => p.status === 'cancelado').length;
    this.ticketMedio = confirmados.length > 0 ? this.receitaTotal / confirmados.length : 0;
    this.maiorVenda = confirmados.reduce((max, p) => Math.max(max, p.totalComDesconto || 0), 0);
    this.caixaPix = confirmados.filter(p => p.formaPagamento === 'Pix').reduce((s, p) => s + (p.totalComDesconto || 0), 0);
    this.caixaDinheiro = confirmados.filter(p => p.formaPagamento === 'Dinheiro').reduce((s, p) => s + (p.totalComDesconto || 0), 0);
    this.caixaCartao = confirmados.filter(p => p.formaPagamento === 'Cartão').reduce((s, p) => s + (p.totalComDesconto || 0), 0);
    this.descontosConcedidos = pedidos.reduce((s, p) => s + (p.desconto || 0), 0);
  }

  private recalcProdutos(p: Produto[]) {
    this.totalProdutos = p.length;
    this.produtosAtivos = p.length;
    this.estoqueBaixo = p.filter(x => x.estoque !== undefined && x.estoque > 0 && x.estoque <= 5).length;
    this.semEstoque = p.filter(x => x.estoque !== undefined && x.estoque <= 0).length;
  }

  private recalcProdutosMaisVendidos(pedidos: Pedido[]) {
    const catPorNome: Record<string, string> = {};
    for (const pr of this.produtosCache) catPorNome[pr.nome] = (pr as any).categoria || '';
    const porProd: Record<string, number> = {};
    const porCat: Record<string, number> = {};
    for (const ped of pedidos) {
      for (const it of (ped.produtos || [])) {
        porProd[it.nome] = (porProd[it.nome] || 0) + it.qtd;
        const cat = catPorNome[it.nome];
        if (cat) porCat[cat] = (porCat[cat] || 0) + it.qtd;
      }
    }
    this.produtoMaisVendido = Object.keys(porProd).sort((a, b) => porProd[b] - porProd[a])[0] || '-';
    this.categoriaMaisVendida = Object.keys(porCat).sort((a, b) => porCat[b] - porCat[a])[0] || '-';
  }

  private recalcClientes() {
    const clientes = this.clientesCache;
    const pedidos = this.pedidosCache;
    this.totalClientes = clientes.length;
    this.clientesNovos = clientes.filter(c => (c.totalPedidos || 0) <= 1).length;
    this.clientesRecorrentes = clientes.filter(c => (c.totalPedidos || 0) > 1).length;
    const topValor = clientes.slice().sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0))[0];
    const topQtd = clientes.slice().sort((a, b) => (b.totalPedidos || 0) - (a.totalPedidos || 0))[0];
    this.maiorClienteValor = topValor ? (topValor.nome || topValor.telefone) : '-';
    this.maiorClienteQtd = topQtd ? (topQtd.nome || topQtd.telefone) : '-';
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
  }

  // Paginação (sobre os 30 do pedidos$ já limitado)
  get pedidosPaginados(): Pedido[] {
    const ini = (this.pagina - 1) * this.porPagina;
    return this.todosPedidos.slice(ini, ini + this.porPagina);
  }
  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.todosPedidos.length / this.porPagina));
  }
  paginaAnterior() { if (this.pagina > 1) this.pagina--; }
  paginaProxima() { if (this.pagina < this.totalPaginas) this.pagina++; }

  // Confirmação de venda (modal)
  abrirConfirmarVenda(p: any) {
    this.confirmarPedidoAlvo = p;
    this.confirmarTitulo = 'Confirmar esta venda?';
    this.confirmarMensagem = `Pedido #${(p.id || '').slice(-6).toUpperCase()} - ${p.clienteNome || ''} - R$ ${(p.totalComDesconto || 0).toFixed(2)}`;
  }
  async executarConfirmarVenda() {
    if (!this.confirmarPedidoAlvo) return;
    this.confirmando = true;
    const p = this.confirmarPedidoAlvo;
    try {
      await this.pedidoService.confirmarVenda(p.id, p.totalComDesconto || 0);
      // ponytail: realtime reflete; nao recria carregarStats
    } catch (e) { console.error(e); alert('Erro ao confirmar venda.'); }
    finally {
      this.confirmando = false;
      this.confirmarPedidoAlvo = null;
    }
  }

  // Cancelar / Estornar (modais já existentes)
  confirmarCancelar(p: any) {
    if (p.status === 'confirmado') {
      alert('Este pedido já foi confirmado. Realize o estorno antes de cancelar.');
      return;
    }
    this.acaoTipo = 'cancelar';
    this.acaoPedido = p;
    this.acaoTitulo = 'Cancelar Pedido';
    this.acaoMensagem = `Confirmar cancelamento do pedido #${(p.id || '').slice(-6).toUpperCase()}?`;
  }
  confirmarEstornar(p: any) {
    this.acaoTipo = 'estornar';
    this.acaoPedido = p;
    this.acaoTitulo = 'Estornar Pedido';
    this.acaoMensagem = `Confirmar estorno do pedido #${(p.id || '').slice(-6).toUpperCase()}? Isso reabrira o caixa.`;
  }
  async executarAcao() {
    if (!this.acaoPedido) return;
    this.acaoExecutando = true;
    const id = this.acaoPedido.id;
    try {
      if (this.acaoTipo === 'cancelar') {
        await this.pedidoService.cancelarPedido(id, 'admin');
      } else {
        await this.pedidoService.estornarPedido(id);
      }
      this.acaoPedido = null;
    } catch (e) {
      console.error(e);
      alert('Erro ao executar ação.');
    } finally {
      this.acaoExecutando = false;
    }
  }

  async logout() {
    await this.afAuth.signOut();
    this.router.navigate(['/admin/login']);
  }

  // Expansão de cards da Visão (sem modal pesado)
  cardAberto: string | null = null;
  toggleCard(nome: string) {
    this.cardAberto = this.cardAberto === nome ? null : nome;
  }

  // Gráficos derivados dos caches (sem listeners/queries novas)
  // Ponytail: período selecionado para o gráfico (7d/30d/mês). Sem libs, sem storage.
  periodo: '7d' | '30d' | 'mes' = '7d';
  diaSel: Date | null = null;

  private toDateUnsafe(p: { createdAt: any }): Date {
    if (!p.createdAt) return new Date(0);
    if (p.createdAt.toDate) return p.createdAt.toDate();
    return new Date(p.createdAt);
  }

  get vendasPorPeriodo(): { dia: string; valor: number; data: Date }[] {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    // Mês: 12 barras (JAN..DEZ) agregadas por mês do ano corrente — não dias
    if (this.periodo === 'mes') {
      const nomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return nomes.map((nome, mi) => {
        const d = new Date(hoje.getFullYear(), mi, 1, 0, 0, 0, 0);
        const prox = new Date(hoje.getFullYear(), mi + 1, 1, 0, 0, 0, 0);
        const valor = this.pedidosCache
          .filter(p => p.status === 'confirmado' && this.toDateUnsafe(p) >= d && this.toDateUnsafe(p) < prox)
          .reduce((s, p) => s + (p.totalComDesconto || 0), 0);
        return { dia: `${nome}/${hoje.getFullYear()}`, valor, data: d };
      });
    }
    let inicio: Date;
    if (this.periodo === '30d') { inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 29); }
    else { inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 6); } // 7d
    const dias: { dia: string; valor: number; data: Date }[] = [];
    for (let d = new Date(inicio); d <= hoje; d.setDate(d.getDate() + 1)) {
      const di = new Date(d); di.setHours(0, 0, 0, 0);
      const prox = new Date(di); prox.setDate(di.getDate() + 1);
      const valor = this.pedidosCache
        .filter(p => p.status === 'confirmado' && this.toDateUnsafe(p) >= di && this.toDateUnsafe(p) < prox)
        .reduce((s, p) => s + (p.totalComDesconto || 0), 0);
      dias.push({ dia: `${di.getDate()}/${di.getMonth() + 1}`, valor, data: di });
    }
    return dias;
  }

  get maxVendaPeriodo(): number {
    return Math.max(1, ...this.vendasPorPeriodo.map(d => d.valor));
  }

  get pedidosDoDiaSel(): Pedido[] {
    if (!this.diaSel) return [];
    const di = new Date(this.diaSel); di.setHours(0, 0, 0, 0);
    const prox = new Date(di); prox.setDate(di.getDate() + 1);
    // Detalhamento: todos os pedidos do dia selecionado (qualquer status)
    return this.pedidosCache.filter(p => this.toDateUnsafe(p) >= di && this.toDateUnsafe(p) < prox);
  }
  get totalDoDiaSel(): number {
    return this.pedidosDoDiaSel.reduce((s, p) => s + (p.totalComDesconto || 0), 0);
  }

  selecionarDia(d: { data: Date }) {
    this.diaSel = (this.diaSel && this.diaSel.getTime() === d.data.getTime()) ? null : d.data;
  }

  get pedidosPorStatus(): { status: string; count: number }[] {
    const ordem = ['pendente', 'confirmado', 'estornado', 'cancelado'];
    return ordem.map(status => ({
      status,
      count: this.pedidosCache.filter(p => p.status === status).length
    })).filter(s => s.count > 0);
  }

  get top5Produtos(): { nome: string; qtd: number }[] {
    const porProd: Record<string, number> = {};
    for (const ped of this.pedidosCache.filter(p => p.status === 'confirmado')) {
      for (const it of (ped.produtos || [])) {
        porProd[it.nome] = (porProd[it.nome] || 0) + it.qtd;
      }
    }
    return Object.keys(porProd)
      .map(nome => ({ nome, qtd: porProd[nome] }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }

  // Teto para as barras (evita divisão por zero no template)
  get maxStatus(): number {
    return Math.max(1, ...this.pedidosPorStatus.map(s => s.count));
  }
  get maxTop5(): number {
    return Math.max(1, ...this.top5Produtos.map(p => p.qtd));
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.subs.unsubscribe();
  }
}
