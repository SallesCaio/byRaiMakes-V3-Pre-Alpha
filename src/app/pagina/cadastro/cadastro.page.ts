import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { CarrinhoService } from '../../carrinho.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, HeaderComponent, BottomNavComponent]
})
export class CadastroPage {
  whatsapp = '5521970579631';
  instagram = 'byraimakes';
  entrega = 'Galeão - Ilha do Governador e arredores';
  cartQtd = 0;
  cartTotal = 0;

  constructor(
    public nav: NavController,
    private carrinho: CarrinhoService
  ) { }

  ionViewWillEnter() {
    this.cartQtd = this.carrinho.qtdTotal();
    this.cartTotal = this.carrinho.total();
  }

  openPage(url: string) {
    this.nav.navigateForward(url);
  }

  abrirWhatsapp() {
    window.open(`https://wa.me/${this.whatsapp}`, '_blank');
  }

  abrirInsta() {
    window.open(`https://instagram.com/${this.instagram}`, '_blank');
  }
}