import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Feedback {
  id?: string;
  pedidoId?: string;
  clienteTelefone: string;
  nota: number;          // 1-5
  comentario?: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly COL = 'feedbacks';

  constructor(private firestore: AngularFirestore) {}

  criarFeedback(f: Omit<Feedback, 'id' | 'createdAt'>): Promise<string> {
    const data: Feedback = { ...f, createdAt: new Date() };
    return this.firestore.collection(this.COL).add(data).then(r => r.id);
  }

  listarRecentes(limit = 50): Observable<Feedback[]> {
    return this.firestore.collection<Feedback>(this.COL, ref =>
      ref.orderBy('createdAt', 'desc').limit(limit)
    ).valueChanges({ idField: 'id' });
  }
}
