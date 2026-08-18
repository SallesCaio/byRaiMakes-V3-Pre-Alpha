import { CarrinhoService, ItemCarrinho } from './carrinho.service';

describe('CarrinhoService', () => {
  let service: CarrinhoService;

  const itemA: ItemCarrinho = { id: 'a', nome: 'Base', preco: 50, img: '', qtd: 1 };
  const itemB: ItemCarrinho = { id: 'b', nome: 'Batom', preco: 30, img: '', qtd: 1 };

  beforeEach(() => {
    // evita persistência entre testes
    localStorage.clear();
    service = new CarrinhoService();
  });

  it('inicia vazio', () => {
    expect(service.listar().length).toBe(0);
    expect(service.total()).toBe(0);
  });

  it('adiciona item novo com qtd 1', () => {
    service.adicionar(itemA);
    expect(service.listar().length).toBe(1);
    expect(service.listar()[0].qtd).toBe(1);
  });

  it('incrementa qtd ao adicionar item existente', () => {
    service.adicionar(itemA);
    service.adicionar(itemA);
    expect(service.listar().length).toBe(1);
    expect(service.listar()[0].qtd).toBe(2);
  });

  it('calcula total corretamente', () => {
    service.adicionar(itemA); // 50
    service.adicionar(itemB); // 30
    service.adicionar(itemB); // +30 => 110
    expect(service.total()).toBe(110);
  });

  it('calcula qtdTotal', () => {
    service.adicionar(itemA);
    service.adicionar(itemB);
    service.adicionar(itemB);
    expect(service.qtdTotal()).toBe(3);
  });

  it('remove item por id', () => {
    service.adicionar(itemA);
    service.adicionar(itemB);
    service.remover('a');
    expect(service.listar().length).toBe(1);
    expect(service.listar()[0].id).toBe('b');
  });

  it('limpa o carrinho', () => {
    service.adicionar(itemA);
    service.limpar();
    expect(service.listar().length).toBe(0);
  });
});
