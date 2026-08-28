import { AgendePage } from './agende.page';
import { of } from 'rxjs';

function make() {
  const carrinho: any = { listar: () => [{ id: 'p1', nome: 'Prod', preco: 10, img: '', qtd: 1 }], total: () => 10, limpar: () => {} };
  const nav: any = { navigateForward: () => {} };
  const afAuth: any = { currentUser: Promise.resolve(null) };
  const pedidoService: any = { criarPedido: () => Promise.resolve('id1') };
  const clienteService: any = {
    normalizarTelefone: (t: string) => '55' + t.replace(/\D/g, ''),
    getClienteOnce: () => Promise.resolve(undefined),
    salvarCliente: () => Promise.resolve(),
    registrarPedido: () => Promise.resolve()
  };
  const viaCep: any = { buscar: () => of({}) };
  const feedbackService: any = { criarFeedback: () => Promise.resolve() };
  const authService: any = { ensureAnonymous: () => Promise.resolve('uid-real-999') };
  const adminSession: any = { adminTargetUrl: () => '/admin/login' };
  const page = new AgendePage(carrinho, nav, afAuth, pedidoService, clienteService, viaCep, feedbackService, authService, adminSession);
  page.itens = carrinho.listar();
  page.total = 10;
  return page;
}

describe('AgendePage (H0.9.2 checkout visitante)', () => {
  it('podeConfirmar false quando termos não aceitos', () => {
    const page = make();
    page.clienteTelefone = '(21) 97057-9631';
    page.clienteNome = 'Maria';
    page.usandoNovoEndereco = true;
    page.novoEndereco = { apelido: '', rua: 'R', num: '1', bairro: 'B', cep: '20000-000' };
    page.termosAceitos = false;
    expect(page.podeConfirmar).toBeFalse();
  });

  it('podeConfirmar true quando termos aceitos e dados completos', () => {
    const page = make();
    page.clienteTelefone = '(21) 97057-9631';
    page.clienteNome = 'Maria';
    page.usandoNovoEndereco = true;
    page.novoEndereco = { apelido: '', rua: 'R', num: '1', bairro: 'B', cep: '20000-000' };
    page.termosAceitos = true;
    expect(page.podeConfirmar).toBeTrue();
  });

  it('confirmarPedido usa userId real (não "anonimo") e registra aceite', async () => {
    const page = make();
    page.clienteTelefone = '(21) 97057-9631';
    page.clienteNome = 'Maria';
    page.usandoNovoEndereco = true;
    page.novoEndereco = { apelido: '', rua: 'R', num: '1', bairro: 'B', cep: '20000-000' };
    page.termosAceitos = true;
    page.mimo = { ativo: false, descricao: '' };
    const criarSpy = spyOn(page['pedidoService'], 'criarPedido').and.callThrough();
    await page.confirmarPedido();
    const arg = criarSpy.calls.mostRecent().args[0];
    expect(arg.userId).toBe('uid-real-999');
    expect(arg.userId).not.toBe('anonimo');
    expect(arg.termosAceitosEm).toBeTruthy();
  });

  it('abrirCheckout abre imediatamente e não bloqueia por ensureAnonymous', async () => {
    const page = make();
    page.itens = [{ id: 'p1', nome: 'Prod', preco: 10, img: '', qtd: 1 }];
    page.total = 10;
    const authSpy = spyOn(page['authService'], 'ensureAnonymous').and.resolveTo('uid-ok');
    await page.abrirCheckout();
    expect(page.showCheckout).toBeTrue();
    // ensureAnonymous não é mais chamado em abrirCheckout; a garantia de auth fica em confirmarPedido
    expect(authSpy).not.toHaveBeenCalled();
  });

  it('mensagem WhatsApp segue estrutura V2 e NÃO inclui o mimo como item', async () => {
    const page = make();
    page.clienteTelefone = '(21) 99940-5497';
    page.clienteNome = 'rafaelle';
    page.clientePagamento = 'Pix';
    page.itens = [{ id: 'p1', nome: 'Gloss Mágico Coelho Vivai', preco: 18, img: '', qtd: 1 }];
    page.total = 18;
    page.usandoNovoEndereco = false;
    page.enderecos = [{ apelido: 'Casa', rua: 'Rua A', num: '100', bairro: 'Centro', cep: '20000-000' }];
    page.enderecoSelecionado = 0;
    page.mimo = { ativo: true, descricao: 'Um carinho especial' };
    page.mimoIncluso = true;
    page.termosAceitos = true;

    const openSpy = spyOn(window, 'open');
    await page.confirmarPedido();

    const url: string = openSpy.calls.mostRecent().args[0] as string;
    const msg = decodeURIComponent(url.split('text=')[1]);

    // Estrutura V2
    expect(msg).toContain('🛍️ *NOVO PEDIDO - byRaiMakes*');
    expect(msg).toContain('👤 *Cliente:* rafaelle');
    expect(msg).toContain('📞 *Tel:* 5521999405497');
    expect(msg).toContain('📍 *Endereco:* Rua A, 100, Centro, 20000-000');
    expect(msg).toContain('💳 *Pagamento:* Pix');
    expect(msg).toContain('📋 *Itens:*');
    expect(msg).toContain('💰 *Subtotal:* R$ 18.00');
    expect(msg).toContain('🎉 *Desconto Pix (10%):* -R$ 1.80');
    expect(msg).toContain('✅ *Total a pagar:* R$ 16.20');
    expect(msg).toContain('_Consulte disponibilidade e area de entrega_');

    // Mimo NÃO deve aparecer como item
    expect(msg).not.toContain('Um carinho especial');
    expect(msg).not.toContain('MIMO GRATIS');
    expect(msg).not.toContain('Amostra grátis');
    // Item real presente
    expect(msg).toContain('Gloss Mágico Coelho Vivai (x1) — R$ 18.00');
  });
});
