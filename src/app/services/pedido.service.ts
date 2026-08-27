import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
  status: 'pendente' | 'confirmado' | 'preparando' | 'enviado' | 'entregue' | 'cancelado';
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

  // Criar novo pedido
  async criarPedido(pedido: Omit<Pedido, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const data = {
      ...pedido,
      createdAt: now,
      updatedAt: now
    };
    const docRef = await this.firestore.collection(this.COLLECTION).add(data);
    return docRef.id;
  }

  // Buscar pedido por ID
  getPedidoById(id: string): Observable<Pedido | undefined> {
    return this.firestore.doc<Pedido>(`${this.COLLECTION}/${id}`).valueChanges();
  }

  // Buscar pedidos do usuário logado
  getPedidosByUser(userId: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref => 
      ref.where('userId', '==', userId)
         .orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  // Buscar todos os pedidos (admin)
  getAllPedidos(): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref => 
      ref.orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  // Buscar pedidos por status (admin)
  getPedidosByStatus(status: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref => 
      ref.where('status', '==', status)
         .orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  // Buscar pedidos com filtros (admin)
  getPedidosFiltrados(filtros: {
    status?: string;
    userId?: string;
    dataInicio?: Date;
    dataFim?: Date;
  }): Observable<Pedido[]> {
    let ref = this.firestore.collection<Pedido>(this.COLLECTION, ref => 
      ref.orderBy('createdAt', 'desc')
    );
    
    if (filtros.status) {
      ref = this.firestore.collection<Pedido>(this.COLLECTION, ref => 
        ref.where('status', '==', filtros.status!)
           .orderBy('createdAt', 'desc')
      );
    }
    
    if (filtros.userId) {
      ref = this.firestore.collection<Pedido>(this.COLLECTION, ref => 
        ref.where('userId', '==', filtros.userId!)
           .orderBy('createdAt', 'desc')
      );
    }
    
    return ref.valueChanges({ idField: 'id' });
  }

  // Atualizar status do pedido
  async atualizarStatus(id: string, status: Pedido['status']): Promise<void> {
    await this.firestore.doc(`${this.COLLECTION}/${id}`).update({
      status,
      updatedAt: new Date()
    });
  }

  // Buscar pedidos por telefone do cliente (Meus Pedidos)
  getPedidosByTelefone(telefone: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>(this.COLLECTION, ref =>
      ref.where('clienteTelefone', '==', telefone)
         .orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  // Confirmar venda: muda status + soma ao caixa
  async confirmarVenda(id: string, valor: number): Promise<void> {
    const dataHoje = new Date().toISOString().slice(0, 10);
    const caixaRef = this.firestore.doc(`caixa/${dataHoje}`);
    const caixaSnap = await caixaRef.get().toPromise();
    const atual = (caixaSnap?.data() as any)?.total || 0;
    await caixaRef.set({ total: atual + valor, updatedAt: new Date() }, { merge: true });
    await this.firestore.doc(`${this.COLLECTION}/${id}`).update({
      status: 'confirmado',
      updatedAt: new Date()
    });
  }

  // Atualizar pedido completo (admin)
  async atualizarPedido(id: string, dados: Partial<Pedido>): Promise<void> {
    await this.firestore.doc(`${this.COLLECTION}/${id}`).update({
      ...dados,
      updatedAt: new Date()
    });
  }

  // Cancelar pedido (cliente)
  async cancelarPedido(id: string, userId: string): Promise<void> {
    const pedido = await this.firestore.doc<Pedido>(`${this.COLLECTION}/${id}`).get().toPromise();
    if (pedido?.data()?.userId === userId) {
      await this.atualizarStatus(id, 'cancelado');
    } else {
      throw new Error('Não autorizado a cancelar este pedido');
    }
  }

  // Estatísticas para dashboard
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
    
    return {
      totalPedidos,
      totalVendas,
      vendasMes,
      ticketMedio,
      porStatus
    };
  }
}