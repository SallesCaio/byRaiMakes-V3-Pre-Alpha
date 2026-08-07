import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CadastroPageRoutingModule } from './cadastro-routing.module';
import { CadastroPage } from './cadastro.page';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CadastroPageRoutingModule,
    HeaderComponent,
    BottomNavComponent,
    CadastroPage
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class CadastroPageModule {}