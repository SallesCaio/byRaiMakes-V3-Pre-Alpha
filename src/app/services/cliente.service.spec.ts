import { ClienteService } from './cliente.service';

// Stub mínimo de AngularFirestore (não usado nos testes de normalizarTelefone)
const docStub: any = {
  valueChanges: () => ({}),
  get: () => ({ toPromise: () => Promise.resolve(null) }),
  set: () => Promise.resolve(),
  update: () => Promise.resolve()
};
const firestoreStub: any = {
  doc: () => docStub,
  collection: () => ({ add: () => Promise.resolve({ id: 'x' }), doc: () => docStub })
};

describe('ClienteService - normalizarTelefone', () => {
  let service: ClienteService;
  beforeEach(() => { service = new ClienteService(firestoreStub); });

  it('mantém DDI 55 e 11 dígitos', () => {
    expect(service.normalizarTelefone('21999998888')).toBe('5521999998888');
  });

  it('adiciona 55 a telefone de 10 dígitos', () => {
    expect(service.normalizarTelefone('2199998888')).toBe('552199998888');
  });

  it('remove máscara (parênteses, espaço, traço)', () => {
    expect(service.normalizarTelefone('(21) 99999-8888')).toBe('5521999998888');
  });

  it('remove zero inicial de DDD (0xx)', () => {
    expect(service.normalizarTelefone('021999998888')).toBe('5521999998888');
  });

  it('mantém telefone já normalizado', () => {
    expect(service.normalizarTelefone('5521999998888')).toBe('5521999998888');
  });

  it('remove caracteres não numéricos', () => {
    expect(service.normalizarTelefone('21.99999.8888')).toBe('5521999998888');
  });
});

describe('ClienteService - getMimo / getClienteOnce (stub)', () => {
  it('getMimo retorna fallback ativo quando doc inexistente', async () => {
    const s = new ClienteService(firestoreStub);
    const mimo = await s.getMimo();
    expect(mimo).not.toBeNull();
    expect(mimo?.ativo).toBe(true);
    expect(mimo?.descricao).toBe('Um carinho especial');
  });
});

describe('ClienteService - registrarPedido (stub)', () => {
  it('incrementa totalPedidos e valorTotal', async () => {
    let saved: any = null;
    const firestore: any = {
      doc: (path: string) => ({
        get: () => ({
          toPromise: () => Promise.resolve({
            exists: true,
            data: () => ({ telefone: '5521999998888', totalPedidos: 2, valorTotal: 200 })
          })
        }),
        update: (d: any) => { saved = d; return Promise.resolve(); },
        set: () => Promise.resolve()
      })
    };
    const s = new ClienteService(firestore);
    await s.registrarPedido('5521999998888', 100);
    expect(saved.totalPedidos).toBe(3);
    expect(saved.valorTotal).toBe(300);
  });
});
