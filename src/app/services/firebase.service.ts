import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Produto {
  id?: string;
  nome: string;
  descricao: string;
  preco: number;
  img?: string;
  imagem?: string;
  categoria: string;
  promo?: string;
  isNew?: boolean;
  ativo: boolean;
  createdAt?: Date;
  estoque?: number;
  preco_custo?: number;
  destaque?: boolean;
}

export interface Categoria {
  id?: string;
  nome: string;
  icon: string;
  ativo: boolean;
  active?: boolean;
}

export interface Banner {
  id?: string;
  titulo: string;
  subtitulo: string;
  cta: string;
  link: string;
  imagemUrl: string;
  ativo: boolean;
  ordem: number;
  createdAt?: Date;
}

export interface Pedido {
  id?: string;
  userId: string;
  produtos: any[];
  total: number;
  status: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private storage: AngularFireStorage
  ) { }

  getProdutos(): Observable<Produto[]> {
    return this.firestore.collection<Produto>('produtos',
      ref => ref.where('ativo', '==', true)
    ).valueChanges({ idField: 'id' });
  }

  getProdutoById(id: string): Observable<Produto | undefined> {
    return this.firestore.doc<Produto>(`produtos/${id}`).valueChanges();
  }

  getProdutosByCategoria(categoria: string): Observable<Produto[]> {
    return this.firestore.collection<Produto>('produtos',
      ref => ref.where('ativo', '==', true).where('categoria', '==', categoria)
    ).valueChanges({ idField: 'id' });
  }

  searchProdutos(termo: string): Observable<Produto[]> {
    const lower = termo.toLowerCase();
    return this.firestore.collection<Produto>('produtos',
      ref => ref.where('ativo', '==', true)
    ).valueChanges({ idField: 'id' }).pipe(
      map(prods => prods.filter(p =>
        p.nome.toLowerCase().includes(lower) ||
        (p.descricao && p.descricao.toLowerCase().includes(lower))
      ))
    );
  }

  getCategorias(): Observable<Categoria[]> {
    return this.firestore.collection<Categoria>('categorias',
      ref => ref.where('ativo', '==', true)
    ).valueChanges({ idField: 'id' });
  }

  createPedido(pedido: Pedido): Promise<any> {
    return this.firestore.collection('pedidos').add({
      ...pedido, createdAt: new Date()
    });
  }

  getPedidosByUser(userId: string): Observable<Pedido[]> {
    return this.firestore.collection<Pedido>('pedidos',
      ref => ref.where('userId', '==', userId)
    ).valueChanges({ idField: 'id' });
  }

  login(email: string, password: string): Promise<any> {
    return this.auth.signInWithEmailAndPassword(email, password);
  }

  register(email: string, password: string): Promise<any> {
    return this.auth.createUserWithEmailAndPassword(email, password);
  }

  logout(): Promise<void> {
    return this.auth.signOut();
  }

  getCurrentUser(): Observable<any> {
    return this.auth.authState;
  }

  uploadImage(file: File, path: string): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${path}/${fileName}`;
    const ref = this.storage.ref(filePath);
    const task = ref.put(file);

    return task.then(snapshot => snapshot.ref.getDownloadURL());
  }

  getAllBanners(): Observable<Banner[]> {
    return this.firestore.collection<Banner>('banners', ref =>
      ref.orderBy('ordem', 'asc')
    ).valueChanges({ idField: 'id' });
  }

  getBannersAtivas(): Observable<Banner[]> {
    return this.firestore.collection<Banner>('banners', ref =>
      ref.where('ativo', '==', true).orderBy('ordem', 'asc')
    ).valueChanges({ idField: 'id' });
  }

  createBanner(banner: Omit<Banner, 'id'>): Promise<any> {
    return this.firestore.collection('banners').add({
      ...banner,
      createdAt: new Date()
    });
  }

  updateBanner(id: string, banner: Partial<Banner>): Promise<void> {
    return this.firestore.doc(`banners/${id}`).update({
      ...banner,
      updatedAt: new Date()
    });
  }

  deleteBanner(id: string): Promise<void> {
    return this.firestore.doc(`banners/${id}`).delete();
  }
}