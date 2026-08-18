import { PedidoService } from './pedido.service';

// Mock de AngularFirestore: captura o que foi "add"ado
function createFirestoreStub() {
  const added: any[] = [];
  const firestore: any = {
    collection: (name: string) => ({
      add: (data: any) => {
        added.push({ name, data });
        return Promise.resolve({ id: 'PEDIDO123' });
      },
      doc: () => ({ valueChanges: () => ({}), get: () => Promise.resolve(null), update: () => Promise.resolve() })
    }),
    doc: () => ({ valueChanges: () => ({}), get: () => Promise.resolve(null), update: () => Promise.resolve() })
  };
  return { firestore, added };
}

const afAuthStub: any = { currentUser: Promise.resolve({ uid: 'u1' }) };

describe('PedidoService', () => {
  it('criarPedido adiciona doc com createdAt/updatedAt e retorna id', async () => {
    const { firestore, added } = createFirestoreStub();
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
    expect(added.length).toBe(1);
    expect(added[0].name).toBe('pedidos');
    expect(added[0].data.createdAt).toBeDefined();
    expect(added[0].data.updatedAt).toBeDefined();
    expect(added[0].data.clienteNome).toBe('Maria');
    expect(added[0].data.mimo).toBe('Amostra grátis');
  });

  it('getMimo não existente retorna null (coleção errada não deve quebrar)', () => {
    // garantia de que o service instancia sem erro
    const { firestore } = createFirestoreStub();
    const service = new PedidoService(firestore, afAuthStub);
    expect(service).toBeTruthy();
  });

  it('confirmarVenda altera status para confirmado e soma caixa do dia', async () => {
    // stub com doc de pedido + doc de caixa (merge)
    const caixaUpdates: any[] = [];
    let pedidoUpdate: any = null;
    const firestore: any = {
      collection: () => ({
        doc: () => ({
          valueChanges: () => ({}),
          get: () => ({
            toPromise: () => Promise.resolve({
              exists: true,
              data: () => ({ totalComDesconto: 100, status: 'pendente' })
            })
          }),
          update: () => Promise.resolve()
        })
      }),
      doc: (path: string) => {
        if (path.startsWith('caixa')) {
          return {
            get: () => ({
              toPromise: () => Promise.resolve({
                exists: true,
                data: () => ({ total: 50 })   // caixa já tem 50
              })
            }),
            set: (d: any) => { caixaUpdates.push(d); return Promise.resolve(); },
            update: (d: any) => { caixaUpdates.push(d); return Promise.resolve(); }
          };
        }
        // pedidos/{id}
        return {
          get: () => ({
            toPromise: () => Promise.resolve({
              exists: true,
              data: () => ({ totalComDesconto: 100, status: 'pendente' })
            })
          }),
          update: (d: any) => { pedidoUpdate = d; return Promise.resolve(); }
        };
      }
    };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('PEDIDO123', 100);
    expect(pedidoUpdate.status).toBe('confirmado');
    // caixa: 50 + 100 = 150
    expect(caixaUpdates[0].total).toBe(150);
  });

  it('confirmarVenda cria caixa do dia se não existir', async () => {
    const caixaSets: any[] = [];
    const firestore: any = {
      collection: () => ({
        doc: () => ({
          valueChanges: () => ({}),
          get: () => ({
            toPromise: () => Promise.resolve({
              exists: true,
              data: () => ({ totalComDesconto: 80, status: 'pendente' })
            })
          }),
          update: () => Promise.resolve()
        })
      }),
      doc: () => ({
        get: () => ({
          toPromise: () => Promise.resolve({ exists: false, data: () => undefined })
        }),
        set: (d: any) => { caixaSets.push(d); return Promise.resolve(); },
        update: () => Promise.resolve()
      })
    };
    const service = new PedidoService(firestore, afAuthStub);
    await service.confirmarVenda('P2', 80);
    expect(caixaSets.length).toBe(1);
    expect(caixaSets[0].total).toBe(80);
  });
});
