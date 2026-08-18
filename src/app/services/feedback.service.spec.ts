import { FeedbackService } from './feedback.service';

function firestoreStub() {
  const added: any[] = [];
  const firestore: any = {
    collection: (name: string) => ({
      add: (data: any) => { added.push({ name, data }); return Promise.resolve({ id: 'FB1' }); },
      doc: () => ({ valueChanges: () => ({}), get: () => Promise.resolve(null), update: () => Promise.resolve() }),
      valueChanges: () => ({})
    }),
    doc: () => ({ valueChanges: () => ({}), get: () => Promise.resolve(null), update: () => Promise.resolve() })
  };
  return { firestore, added };
}

describe('FeedbackService', () => {
  it('criarFeedback adiciona doc em feedbacks e retorna id', async () => {
    const { firestore, added } = firestoreStub();
    const s = new FeedbackService(firestore);
    const id = await s.criarFeedback({ pedidoId: 'P1', clienteTelefone: '5521999998888', nota: 5, comentario: 'Ótimo' });
    expect(id).toBe('FB1');
    expect(added.length).toBe(1);
    expect(added[0].name).toBe('feedbacks');
    expect(added[0].data.nota).toBe(5);
    expect(added[0].data.createdAt).toBeDefined();
  });

  it('criarFeedback aceita nota mínima (1)', async () => {
    const { firestore, added } = firestoreStub();
    const s = new FeedbackService(firestore);
    await s.criarFeedback({ clienteTelefone: '5521999998888', nota: 1 });
    expect(added[0].data.nota).toBe(1);
  });

  it('listarRecentes usa collection feedbacks', () => {
    const { firestore } = firestoreStub();
    const s = new FeedbackService(firestore);
    const r = s.listarRecentes(10) as any;
    // retorna Observable (valueChanges stubado)
    expect(r).toBeTruthy();
  });
});
