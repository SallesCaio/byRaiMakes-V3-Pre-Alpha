import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

export interface EnderecoCliente {
  apelido: string;      // ex: "Casa", "Trabalho"
  rua: string;
  num: string;
  bairro: string;
  cep: string;
  complemento?: string;
}

export interface Cliente {
  telefone: string;            // normalizado: 5521970579631
  nome: string;
  enderecos: EnderecoCliente[];
  totalPedidos: number;
  valorTotal: number;
  consentimentoLGPD: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConfigMimo {
  ativo: boolean;
  descricao: string;
  produtoId?: string;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly COL = 'clientes';
  private readonly CONFIG = 'config';

  constructor(private firestore: AngularFirestore) {}

  // Normaliza telefone: remove não-dígitos, garante DDI 55
  normalizarTelefone(tel: string): string {
    let t = (tel || '').replace(/\D/g, '');
    // remove zero inicial do DDD (ex: 021 -> 21)
    if (t.startsWith('0')) t = t.slice(1);
    if (t.length === 10 || t.length === 11) t = '55' + t;
    return t;
  }

  getCliente(telefoneRaw: string): Observable<Cliente | undefined> {
    const tel = this.normalizarTelefone(telefoneRaw);
    return this.firestore.doc<Cliente>(`${this.COL}/${tel}`).valueChanges();
  }

  async getClienteOnce(telefoneRaw: string): Promise<Cliente | undefined> {
    const tel = this.normalizarTelefone(telefoneRaw);
    const snap = await this.firestore.doc<Cliente>(`${this.COL}/${tel}`).get().toPromise();
    return snap?.data();
  }

  async salvarCliente(cliente: Cliente): Promise<void> {
    const tel = this.normalizarTelefone(cliente.telefone);
    const now = new Date();
    const existente = await this.getClienteOnce(tel);
    const data: Cliente = {
      ...cliente,
      telefone: tel,
      createdAt: existente?.createdAt || now,
      updatedAt: now
    };
    await this.firestore.doc(`${this.COL}/${tel}`).set(data, { merge: true });
  }

  // Incrementa contadores para ranking (cliente que mais compra)
  async registrarPedido(telefoneRaw: string, valor: number): Promise<void> {
    const tel = this.normalizarTelefone(telefoneRaw);
    const ref = this.firestore.doc<Cliente>(`${this.COL}/${tel}`);
    const snap = await ref.get().toPromise();
    const c = snap?.data();
    await ref.update({
      totalPedidos: (c?.totalPedidos || 0) + 1,
      valorTotal: (c?.valorTotal || 0) + valor,
      updatedAt: new Date()
    } as Partial<Cliente>);
  }

  // Lê config do mimo (catálogo grátis)
  async getMimo(): Promise<ConfigMimo | null> {
    const snap = await this.firestore.doc<ConfigMimo>(`${this.CONFIG}/mimo`).get().toPromise();
    return snap?.data() || null;
  }
}
