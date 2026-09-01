import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { FirebaseService, Produto } from '../../services/firebase.service';
import { AdminSessionService } from '../../services/admin-session.service';
import { CarrinhoService, ItemCarrinho } from '../../carrinho.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

interface HeroSlide {
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  bg: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, BottomNavComponent]
})

export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    public nav: NavController,
    private fb: FirebaseService,
    private carrinho: CarrinhoService,
    private adminSession: AdminSessionService
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

  openAdmin() {
    this.nav.navigateForward(this.adminSession.adminTargetUrl());
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
      this.produtos = prods.filter(p => p.destaque === true);
    });
  }

  loadProdutosByCategoria(cat: string) {
    if (cat === 'Todos') {
      this.loadProdutos();
    } else {
      this.fb.getProdutosByCategoria(cat).subscribe(prods => {
        this.produtos = prods.filter(p => p.destaque === true);
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

  slides: HeroSlide[] = [
    { 
      title: 'Seu glow começa aqui', 
      subtitle: 'Produtos escolhidos para realçar sua beleza', 
      cta: 'Conheça', 
      link: '/servicos', 
      bg: 'linear-gradient(135deg, #e884b0 0%, #d4a93f 100%)' 
    },
    { title: 'Novidades',
      subtitle: 'Confira as últimas chegadas', 
      cta: 'Ver Novidades', 
      link: '/servicos', 
      bg: 'linear-gradient(135deg, #d4a93f 0%, #e884b0 100%)' 
    },
    { 
      title: 'Um carinho especial', 
      subtitle: 'Um mimo acompanha sua compra', 
      cta: 'Conheça', 
      link: '/servicos', 
      bg: 'linear-gradient(135deg, #a8456b 0%, #e884b0 100%)' 
    }
  ];

  showModal = false;
  produtoModal: Produto | null = null;
  slideAtivo = 0;
  private slideAuto?: ReturnType<typeof setInterval>;
  isBrowser = typeof window !== 'undefined';

  nextSlide() { this.slideAtivo = (this.slideAtivo + 1) % this.slides.length; }
  prevSlide() { this.slideAtivo = (this.slideAtivo - 1 + this.slides.length) % this.slides.length; }
  setSlide(i: number) { this.slideAtivo = i; }

  ngAfterViewInit() { this.startAuto(); }
  ngOnDestroy() { this.stopAuto(); }
  private startAuto() { if (this.isBrowser) { this.stopAuto(); this.slideAuto = setInterval(() => this.nextSlide(), 5000); } }
  private stopAuto() { if (this.slideAuto) clearInterval(this.slideAuto); }

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