import { Subscription } from 'rxjs';
import { of } from 'rxjs';
import { AdminDashboardPage } from './dashboard.page';

// Stub mínimo do AngularFirestore: cada collection/doc retorna Observable quente
function firestoreStub() {
  const obs = of([] as any[]);
  const ref: any = { valueChanges: () => obs, get: () => Promise.resolve({ data: () => ({}) }) };
  return {
    collection: () => ref,
    doc: () => ({ valueChanges: () => obs, get: () => Promise.resolve({ data: () => ({}) }), set: () => Promise.resolve() })
  };
}

function make() {
  const afAuth: any = { signOut: () => Promise.resolve(), authState: of(null) };
  const pedidoService: any = {
    confirmarVenda: () => Promise.resolve(),
    cancelarPedido: () => Promise.resolve(),
    atualizarStatus: () => Promise.resolve()
  };
  const page = new AdminDashboardPage(afAuth, firestoreStub() as any, pedidoService, { navigate: () => {} } as any);
  page.ngOnInit();
  return page;
}

describe('AdminDashboardPage (H0.9.2)', () => {
  it('pedido pendente pode ser cancelado (modal abre)', () => {
    const page = make();
    const pedido = { id: 'x1', status: 'pendente' };
    spyOn(window, 'alert');
    page.confirmarCancelar(pedido);
    expect(page.acaoPedido).toBe(pedido);
    expect((window as any).alert).not.toHaveBeenCalled();
  });

  it('pedido confirmado NÃO pode ser cancelado direto (alerta + sem modal)', () => {
    const page = make();
    const pedido = { id: 'x2', status: 'confirmado' };
    spyOn(window, 'alert');
    page.confirmarCancelar(pedido);
    expect((window as any).alert).toHaveBeenCalledWith('Este pedido já foi confirmado. Realize o estorno antes de cancelar.');
    expect(page.acaoPedido).toBeNull();
  });

  it('carregarStats não recria listeners após abrir confirmação de venda', () => {
    const page = make();
    const subsAntes = (page as any).subs;
    page.abrirConfirmarVenda({ id: 'x1' });
    expect((page as any).subs).toBe(subsAntes); // mesma instância, não novo objeto
    expect(page.confirmarPedidoAlvo).toBeTruthy();
  });

  it('ngOnDestroy encerra subscriptions (sem vazamento de listeners)', () => {
    const page = make();
    spyOn((page as any).subs, 'unsubscribe').and.callThrough();
    page.ngOnDestroy();
    expect((page as any).subs.unsubscribe).toHaveBeenCalled();
  });
});
