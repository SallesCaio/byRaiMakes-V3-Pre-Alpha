import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

interface NavItem {
  icon: string;
  label: string;
  url: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <div class="bottom-nav">
      <a *ngFor="let item of navItems" 
         class="nav-item" 
         [class.active]="item.url === activeUrl"
         [routerLink]="item.url"
         routerLinkActive="active">
        <ion-icon [name]="item.icon"></ion-icon>
        <span>{{ item.label }}</span>
      </a>
    </div>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #ffffff;
      border-top: 1px solid #f5f5f5;
      display: flex;
      justify-content: space-around;
      padding: 8px 0;
      z-index: 1000;
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      color: #a88698;
      font-size: 10px;
      font-weight: 500;
      text-decoration: none;
      padding: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .nav-item.active { color: #e884b0; }
    .nav-item:hover { color: #e884b0; }
    ion-icon { font-size: 24px; }
  `]
})
export class BottomNavComponent {
  @Input() activeUrl = '/home';

  navItems: NavItem[] = [
    { icon: 'home-outline', label: 'Início', url: '/home' },
    { icon: 'bag-outline', label: 'Catálogo', url: '/servicos' },
    { icon: 'cart-outline', label: 'Carrinho', url: '/agende' },
    { icon: 'receipt-outline', label: 'Meus Pedidos', url: '/meus-pedidos' }
  ];
}