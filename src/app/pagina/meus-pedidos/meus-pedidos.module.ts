import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MeusPedidosPageRoutingModule } from './meus-pedidos-routing.module';
import { MeusPedidosPage } from './meus-pedidos.page';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MeusPedidosPageRoutingModule,
    HeaderComponent,
    BottomNavComponent,
    MeusPedidosPage
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class MeusPedidosPageModule {}
