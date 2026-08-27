import { AgendePage } from './agende.page';

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
  const page = new AgendePage(carrinho, nav, afAuth, pedidoService, clienteService, viaCep, feedbackService, authService);
  page.itens = carrinho.listar();
  page.total = 10;
  return page;
}

import { of } from 'rxjs';

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
});
