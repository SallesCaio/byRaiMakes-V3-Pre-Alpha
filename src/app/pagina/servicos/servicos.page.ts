import { Component, OnInit } from '@angular/core';
import { ToastController, NavController } from '@ionic/angular';
import { CarrinhoService, ItemCarrinho } from '../../carrinho.service';
import { FirebaseService, Produto } from '../../services/firebase.service';
import { AdminSessionService } from '../../services/admin-session.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-servicos',
  templateUrl: './servicos.page.html',
  styleUrls: ['./servicos.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, BottomNavComponent]
})
export class ServicosPage implements OnInit {
  produtos: Produto[] = [];
  categorias: string[] = [];
  catSelecionada = 'Todos';
  cartQtd = 0;
  cartTotal = 0;

  constructor(
    private carrinho: CarrinhoService,
    private toast: ToastController,
    private fb: FirebaseService,
    public nav: NavController,
    private adminSession: AdminSessionService,
  ) { }

  ngOnInit() {
    this.loadProdutos();
  }

  ionViewWillEnter() {
    this.atualizarCart();
  }

  openPage(url: string) {
    this.nav.navigateForward(url);
  }

  openAdmin() {
    this.nav.navigateForward(this.adminSession.adminTargetUrl());
  }

  loadProdutos() {
    this.fb.getProdutos().subscribe(prods => {
      this.produtos = prods;
      this.categorias = [...new Set(prods.map(p => p.categoria))];
    });
  }

  filtrar(cat: string) {
    this.catSelecionada = cat;
    if (cat === 'Todos') {
      this.fb.getProdutos().subscribe(prods => this.produtos = prods);
    } else {
      this.fb.getProdutosByCategoria(cat).subscribe(prods => this.produtos = prods);
    }
  }

  semEstoque(p: Produto): boolean {
    return p.estoque !== undefined && p.estoque <= 0;
  }

  atualizarCart() {
    this.cartQtd = this.carrinho.qtdTotal();
    this.cartTotal = this.carrinho.total();
  }

  async add(p: Produto) {
    if (this.semEstoque(p)) {
      const t = await this.toast.create({
        message: `${p.nome} indisponivel - sem estoque`,
        duration: 2000,
        color: 'danger',
        position: 'bottom',
      });
      await t.present();
      return;
    }

    const item: ItemCarrinho = {
      id: p.id || '',
      nome: p.nome,
      preco: p.preco,
      img: p.imagem || p.img || '',
      qtd: 1,
    };
    this.carrinho.adicionar(item);
    this.atualizarCart();
    const t = await this.toast.create({
      message: `${p.nome} adicionado ao carrinho`,
      duration: 1200,
      color: 'success',
      position: 'bottom',
    });
    await t.present();
  }
}