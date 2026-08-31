import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Produto } from './firebase.service';

export interface PedidoItem {
  id: string;
  nome: string;
  preco: number;
  img: string;
  qtd: number;
  subtotal: number;
}

export interface Pedido {
  id?: string;
  userId: string;
  produtos: PedidoItem[];
  total: number;
  status: 'pendente' | 'confirmado' | 'estornado' | 'cancelado';
  clienteTelefone: string;
  clienteNome: string;
  clienteEndereco: string;
  formaPagamento: 'Pix' | 'Dinheiro' | 'Cartão';
  desconto: number;
  totalComDesconto: number;
  mimo?: string;
  observacoes?: string;
  termosAceitosEm?: Date | null;
  expanded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly COLLECTION = 'pedidos';

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth
  ) {}

  async criarPedido(pedido: Omit<Pedido, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const data = { ...pedido, createdAt: now, updatedAt: now };
    const docRef = await this.firestore.collection(this.COLLECTION).add(data);
    return docRef.id;
  }

  getPedidoById(id: string): Observable<Pedido | undefined> {
    return this.firestore.doc<Pedido>(`${this.COLLECTION}/${id}`).valueChanges();
  }

  getPedidosByUser(userId: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.where('userId', '==', userId).orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  getAllPedidos(): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  getPedidosByStatus(status: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.where('status', '==', status).orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  getPedidosFiltrados(filtros: {
    status?: string;
    userId?: string;
    dataInicio?: Date;
    dataFim?: Date;
  }): Observable<Pedido[]> {
    let ref = this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.orderBy('createdAt', 'desc')
    );
    if (filtros.status) ref = this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.where('status', '==', filtros.status!).orderBy('createdAt', 'desc')
    );
    if (filtros.userId) ref = this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.where('userId', '==', filtros.userId!).orderBy('createdAt', 'desc')
    );
    return ref.valueChanges({ idField: 'id' });
  }

  async atualizarStatus(id: string, status: Pedido['status']): Promise<void> {
    await this.firestore.doc(`${this.COLLECTION}/${id}`).update({
      status, updatedAt: new Date()
    });
  }

  getPedidosByTelefone(telefone: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.where('clienteTelefone', '==', telefone).orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  // ponytail: FASE 1 = todos os READs; FASE 2 = validações; FASE 3 = todos os WRITEs.
  // Não há READ depois de WRITE (Firestore rejeita).
  async confirmarVenda(id: string, valor: number): Promise<void> {
    const pedidoDoc = this.firestore.doc(`${this.COLLECTION}/${id}`);
    const snap = await pedidoDoc.get().toPromise();
    const pedido = snap?.data() as (Pedido & { produtos: PedidoItem[] }) | undefined;
    const dataHoje = new Date().toISOString().slice(0, 10);
    const caixaRef = this.firestore.doc(`caixa/${dataHoje}`);
    const produtosRef = this.firestore.collection('produtos');

    await this.firestore.firestore.runTransaction(async (t: any) => {
      // FASE 1: READS de TODOS os produtos + caixa
      const produtosSnaps = await Promise.all(
        (pedido?.produtos || []).map(async (item) => ({
          item,
          snap: await t.get(produtosRef.doc(item.id).ref)
        }))
      );
      const caixaSnap = await t.get(caixaRef.ref);

      // FASE 2: VALIDAÇÕES
      const estoques = produtosSnaps.map(({ item, snap }) => {
        if (!snap.exists) throw new Error(`Produto ${item.id} não encontrado`);
        const prod = snap.data() as Produto;
        const estoqueAtual = prod.estoque ?? 0;
        if (estoqueAtual < item.qtd) {
          throw new Error(`Estoque insuficiente para ${prod.nome}. Tem ${estoqueAtual}, precisa de ${item.qtd}.`);
        }
        return { item, estoqueAtual: Math.max(0, estoqueAtual - item.qtd) };
      });

      // FASE 3: WRITES
      for (const { item, estoqueAtual } of estoques) {
        t.set(produtosRef.doc(item.id).ref, { estoque: estoqueAtual }, { merge: true });
      }
      const atualCaixa = caixaSnap.exists ? (caixaSnap.data() as any)?.total || 0 : 0;
      t.set(caixaRef.ref, { total: atualCaixa + valor, updatedAt: new Date() }, { merge: true });
      t.update(pedidoDoc.ref, { status: 'confirmado', updatedAt: new Date() });
    });
  }

  // ponytail: mesmo padrão READ→VALIDATE→WRITE
  async estornarPedido(id: string): Promise<void> {
    const pedidoDoc = this.firestore.doc(`${this.COLLECTION}/${id}`);
    const snap = await pedidoDoc.get().toPromise();
    const pedido = snap?.data() as (Pedido & { produtos: PedidoItem[] }) | undefined;
    if (!pedido) throw new Error('Pedido não encontrado');

    const dataHoje = new Date().toISOString().slice(0, 10);
    const caixaRef = this.firestore.doc(`caixa/${dataHoje}`);
    const produtosRef = this.firestore.collection('produtos');

    await this.firestore.firestore.runTransaction(async (t: any) => {
      // FASE 1: READS
      const produtosSnaps = await Promise.all(
        (pedido.produtos || []).map(async (item) => ({
          item,
          snap: await t.get(produtosRef.doc(item.id).ref)
        }))
      );
      const caixaSnap = await t.get(caixaRef.ref);

      // FASE 2: VALIDAÇÕES (nenhum erro aqui, só leitura)

      // FASE 3: WRITES
      for (const { item, snap } of produtosSnaps) {
        if (!snap.exists) continue;
        const prod = snap.data() as Produto;
        const estoqueAtual = prod.estoque ?? 0;
        t.set(produtosRef.doc(item.id).ref, { estoque: estoqueAtual + item.qtd }, { merge: true });
      }
      const atualCaixa = caixaSnap.exists ? (caixaSnap.data() as any)?.total || 0 : 0;
      t.set(caixaRef.ref, { total: Math.max(0, atualCaixa - (pedido.totalComDesconto || 0)), updatedAt: new Date() }, { merge: true });
      t.update(pedidoDoc.ref, { status: 'estornado', updatedAt: new Date() });
    });
  }

  async atualizarPedido(id: string, dados: Partial<Pedido>): Promise<void> {
    await this.firestore.doc(`${this.COLLECTION}/${id}`).update({ ...dados, updatedAt: new Date() });
  }

  async cancelarPedido(id: string, userId: string): Promise<void> {
    const pedido = await this.firestore.doc<Pedido>(`${this.COLLECTION}/${id}`).get().toPromise();
    if (pedido?.data()?.userId === userId) {
      await this.atualizarStatus(id, 'cancelado');
    } else {
      throw new Error('Não autorizado a cancelar este pedido');
    }
  }

  async getEstatisticas(): Promise<{
    totalPedidos: number;
    totalVendas: number;
    vendasMes: number;
    ticketMedio: number;
    porStatus: Record<string, number>;
  }> {
    const snapshot = await this.firestore.collection(this.COLLECTION).get().toPromise();
    const pedidos = snapshot?.docs.map(d => d.data() as Pedido) || [];

    const totalPedidos = pedidos.length;
    const totalVendas = pedidos.reduce((sum, p) => sum + p.totalComDesconto, 0);

    const mesAtual = new Date();
    mesAtual.setDate(1);
    mesAtual.setHours(0, 0, 0, 0);
    const vendasMes = pedidos
      .filter(p => p.createdAt >= mesAtual)
      .reduce((sum, p) => sum + p.totalComDesconto, 0);

    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

    const porStatus: Record<string, number> = {};
    pedidos.forEach(p => {
      porStatus[p.status] = (porStatus[p.status] || 0) + 1;
    });

    return { totalPedidos, totalVendas, vendasMes, ticketMedio, porStatus };
  }
}