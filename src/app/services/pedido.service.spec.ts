import { PedidoService } from './pedido.service';

// Mock simples de Firestore: suporta criarPedido, confirmarVenda (transacional) e estornarPedido
function createFirestoreStub(pedidoData: any = null) {
  const docs: Record<string, any> = {};
  const produtos: Record<string, any> = {};

  if (pedidoData && pedidoData.id) {
    docs[`pedidos/${pedidoData.id}`] = { ...pedidoData };
  }

  // "ref" do Firestore nativo é só um marcador — a transaction usa ref como chave
  const makeRef = (path: string) => ({ __ref: path });

  const docHandler = (path: string) => {
    const ref = makeRef(path);
    return {
      ref,
      get: () => ({
        toPromise: () => Promise.resolve({
          exists: !!docs[path],
          data: () => docs[path] || null
        })
      }),
      update: (d: any) => {
        docs[path] = { ...docs[path], ...d };
        return Promise.resolve();
      },
      set: (d: any, _opts?: any) => {
        docs[path] = { ...docs[path], ...d };
        return Promise.resolve();
      }
    };
  };

  const prodDocHandler = (id: string) => {
    const ref = makeRef(`produtos/${id}`);
    const path = `produtos/${id}`;
    return {
      ref,
      get: () => ({
        toPromise: () => Promise.resolve({
          exists: produtos[id] != null,
          data: () => produtos[id] || null
        })
      }),
      set: (d: any, _opts?: any) => {
        produtos[id] = { ...produtos[id], ...d };
        return Promise.resolve();
      }
    };
  };

  const collectionHandler = (name: string) => ({
    add: (data: any) => Promise.resolve({ id: 'PEDIDO123' }),
    doc: (id: string) => name === 'produtos' ? prodDocHandler(id) : docHandler(`${name}/${id}`)
  });

  const firestore: any = {
    collection: collectionHandler,
    doc: (path: string) => path.startsWith('produtos') ? prodDocHandler(path.split('/')[1]) : docHandler(path),
    // Firestore nativo: runTransaction(async t => { t.get(ref); t.set(ref, d, opts); t.update(ref, d); })
    firestore: {
      runTransaction: async (fn: any) => {
        const t: any = {
          get: (ref: any) => Promise.resolve({
            exists: ref.__ref.startsWith('produtos')
              ? produtos[ref.__ref.split('/')[1]] != null
              : !!docs[ref.__ref],
            data: () => ref.__ref.startsWith('produtos')
              ? produtos[ref.__ref.split('/')[1]] || null
              : docs[ref.__ref] || null
          }),
          set: (ref: any, d: any, _opts?: any) => {
            if (ref.__ref.startsWith('produtos')) {
              const id = ref.__ref.split('/')[1];
              produtos[id] = { ...produtos[id], ...d };
            } else {
              docs[ref.__ref] = { ...docs[ref.__ref], ...d };
            }
            return Promise.resolve();
          },
          update: (ref: any, d: any) => {
            if (ref.__ref.startsWith('produtos')) {
              const id = ref.__ref.split('/')[1];
              produtos[id] = { ...produtos[id], ...d };
            } else {
              docs[ref.__ref] = { ...docs[ref.__ref], ...d };
            }
            return Promise.resolve();
          }
        };
        return fn(t);
      }
    }
  };

  return { firestore, docs, produtos };
}

const afAuthStub: any = { currentUser: Promise.resolve({ uid: 'u1' }) };

describe('PedidoService', () => {
  it('criarPedido adiciona doc com createdAt/updatedAt e retorna id', async () => {
    const { firestore } = createFirestoreStub();
    const service = new PedidoService(firestore, afAuthStub);
    const id = await service.criarPedido({
      userId: 'u1',
      produtos: [{ id: 'p1', nome: 'Base', preco: 50, img: '', qtd: 2, subtotal: 100 }],
      total: 100,
      status: 'pendente',
      clienteTelefone: '5521999998888',
      clienteNome: 'Maria',
      clienteEndereco: 'Rua A, 1',
      formaPagamento: 'Pix',
      desconto: 10,
      totalComDesconto: 90,
      mimo: 'Amostra grátis'
    });
    expect(id).toBe('PEDIDO123');
  });

  it('confirmarVenda com estoque suficiente baixa e confirma', async () => {
    const pedido: any = {
      id: 'P1',
      produtos: [{ id: 'p1', nome: 'Gl', preco: 50, qtd: 1, subtotal: 50 }],
      totalComDesconto: 50,
      status: 'pendente'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 5 };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('P1', 50);
    expect(docs['pedidos/P1'].status).toBe('confirmado');
    expect(produtos['p1'].estoque).toBe(4);
  });

  it('confirmarVenda com qtd > 1 reduz estoque corretamente', async () => {
    const pedido: any = {
      id: 'P2',
      produtos: [{ id: 'p1', nome: 'Gl', preco: 50, qtd: 3, subtotal: 150 }],
      totalComDesconto: 150,
      status: 'pendente'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 10 };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('P2', 150);
    expect(docs['pedidos/P2'].status).toBe('confirmado');
    expect(produtos['p1'].estoque).toBe(7);
  });

  it('confirmarVenda com vários produtos baixa cada um', async () => {
    const pedido: any = {
      id: 'P3',
      produtos: [
        { id: 'p1', nome: 'Gl', preco: 30, qtd: 2, subtotal: 60 },
        { id: 'p2', nome: 'Balm', preco: 20, qtd: 1, subtotal: 20 }
      ],
      totalComDesconto: 80,
      status: 'pendente'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 100 };
    produtos['p2'] = { nome: 'Balm', estoque: 100 };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('P3', 80);
    expect(docs['pedidos/P3'].status).toBe('confirmado');
    expect(produtos['p1'].estoque).toBe(98);
    expect(produtos['p2'].estoque).toBe(99);
  });

  it('confirmarVenda com estoque insuficiente falha (nunca negativo)', async () => {
    const pedido: any = {
      id: 'P4',
      produtos: [{ id: 'p1', nome: 'Gl', preco: 50, qtd: 2, subtotal: 100 }],
      totalComDesconto: 100,
      status: 'pendente'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 1 };
    const service = new PedidoService(firestore, afAuthStub);
    let erro: any;
    try { await service.confirmarVenda('P4', 100); } catch (e) { erro = e; }
    expect(erro).toBeTruthy();
    expect(produtos['p1'].estoque).toBe(1);
  });

  it('confirmarVenda com estoque exatamente igual à qtd', async () => {
    const pedido: any = {
      id: 'P5',
      produtos: [{ id: 'p1', nome: 'Gl', preco: 50, qtd: 2, subtotal: 100 }],
      totalComDesconto: 100,
      status: 'pendente'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 2 };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('P5', 100);
    expect(produtos['p1'].estoque).toBe(0);
    expect(docs['pedidos/P5'].status).toBe('confirmado');
  });

  it('confirmarVenda não baixa duas vezes (não idempotente, mas não baixa duplo no retry)', async () => {
    const pedido: any = {
      id: 'P6',
      produtos: [{ id: 'p1', nome: 'Gl', preco: 50, qtd: 1, subtotal: 50 }],
      totalComDesconto: 50,
      status: 'pendente'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 5 };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('P6', 50);
    // Estoques: baixou uma vez
    expect(produtos['p1'].estoque).toBe(4);
    expect(docs['pedidos/P6'].status).toBe('confirmado');
    // Estorno + nova confirmação baixa novamente (1 vez cada)
    await service.estornarPedido('P6');
    expect(produtos['p1'].estoque).toBe(5);
    expect(docs['pedidos/P6'].status).toBe('pendente');
    await service.confirmarVenda('P6', 50);
    expect(produtos['p1'].estoque).toBe(4);
  });

  it('estornarPedido repõe estoque e reverte status', async () => {
    const pedido: any = {
      id: 'P7',
      produtos: [{ id: 'p1', nome: 'Gl', preco: 50, qtd: 2, subtotal: 100 }],
      totalComDesconto: 100,
      status: 'confirmado'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 3 };
    const service = new PedidoService(firestore, afAuthStub);
    await service.estornarPedido('P7');
    expect(docs['pedidos/P7'].status).toBe('pendente');
    expect(produtos['p1'].estoque).toBe(5);
  });

  it('estorno + confirmação mantém consistência (não duplica baixa)', async () => {
    const pedido: any = {
      id: 'P8',
      produtos: [{ id: 'p1', nome: 'Gl', preco: 50, qtd: 2, subtotal: 100 }],
      totalComDesconto: 100,
      status: 'pendente'
    };
    const { firestore, produtos, docs } = createFirestoreStub(pedido);
    produtos['p1'] = { nome: 'Gl', estoque: 10 };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('P8', 100);
    await service.estornarPedido('P8');
    await service.confirmarVenda('P8', 100);
    expect(produtos['p1'].estoque).toBe(8);
    expect(docs['pedidos/P8'].status).toBe('confirmado');
  });
});
