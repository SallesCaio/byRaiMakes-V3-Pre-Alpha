import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { FirebaseService, Produto } from '../../services/firebase.service';
import { CarrinhoService, ItemCarrinho } from '../../carrinho.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, BottomNavComponent]
})
export class HomePage implements OnInit {
  constructor(
    public nav: NavController,
    private fb: FirebaseService,
    private carrinho: CarrinhoService
  ) { }

  ngOnInit() {
    this.loadProdutos();
    this.loadCategorias();
  }

  ionViewWillEnter() {
    this.atualizarCart();
  }

  openPage(url: string) {
    this.nav.navigateForward(url);
  }

  openProduct(p: Produto) {
    this.produtoModal = p;
    this.showModal = true;
  }

  selectCategory(cat: any) {
    this.categorias.forEach(c => c.active = false);
    cat.active = true;
    this.loadProdutosByCategoria(cat.nome);
  }

  loadProdutos() {
    this.fb.getProdutos().subscribe(prods => {
      this.produtos = prods;
    });
  }

  loadProdutosByCategoria(cat: string) {
    if (cat === 'Todos') {
      this.loadProdutos();
    } else {
      this.fb.getProdutosByCategoria(cat).subscribe(prods => {
        this.produtos = prods;
      });
    }
  }

  loadCategorias() {
    this.fb.getCategorias().subscribe(cats => {
      if (cats.length) {
        this.categorias = [
          { nome: 'Todos', icon: 'grid-outline', active: true, ativo: true },
          ...cats
        ];
      }
    });
  }

  atualizarCart() {
    this.cartQtd = this.carrinho.qtdTotal();
    this.cartTotal = this.carrinho.total();
  }

  categorias: any[] = [
    { nome: 'Todos', icon: 'grid-outline', active: true, ativo: true },
    { nome: 'Cabelo', icon: 'cut-outline', active: false, ativo: true },
    { nome: 'Olhos', icon: 'eye-outline', active: false, ativo: true },
    { nome: 'Boca', icon: 'color-palette-outline', active: false, ativo: true },
    { nome: 'Pele', icon: 'leaf-outline', active: false, ativo: true },
    { nome: 'Rosto', icon: 'sparkles-outline', active: false, ativo: true },
    { nome: 'Corpo', icon: 'accessibility-outline', active: false, ativo: true },
    { nome: 'Acessórios', icon: 'bag-handle-outline', active: false, ativo: true }
  ];

  produtos: Produto[] = [];
  cartQtd = 0;
  cartTotal = 0;

  slides: any[] = [
    { title: 'Nova Coleção', subtitle: 'Descubra os produtos', cta: 'Ver Coleção', link: '/servicos', bg: 'linear-gradient(135deg, #e884b0 0%, #d4a93f 100%)' },
    { title: 'Leve 3 por R$ 79,90', subtitle: 'Escolha seus favoritos', cta: 'Ver Ofertas', link: '/servicos', bg: 'linear-gradient(135deg, #d4a93f 0%, #e884b0 100%)' },
    { title: 'Frete Grátis', subtitle: 'Em compras acima de R$ 150', cta: 'Aproveitar', link: '/servicos', bg: 'linear-gradient(135deg, #a8456b 0%, #e884b0 100%)' }
  ];

  showModal = false;
  produtoModal: Produto | null = null;

  addToCartModal(p: Produto) {
    const item: ItemCarrinho = {
      id: p.id || '',
      nome: p.nome,
      preco: p.preco,
      img: p.imagem || p.img || '',
      qtd: 1,
    };
    this.carrinho.adicionar(item);
    this.atualizarCart();
    this.showModal = false;
  }
}