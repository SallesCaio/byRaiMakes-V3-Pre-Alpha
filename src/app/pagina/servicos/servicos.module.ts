import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ServicosPageRoutingModule } from './servicos-routing.module';
import { ServicosPage } from './servicos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ServicosPageRoutingModule
  ],
  declarations: [ServicosPage],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ServicosPageModule {}