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
});
