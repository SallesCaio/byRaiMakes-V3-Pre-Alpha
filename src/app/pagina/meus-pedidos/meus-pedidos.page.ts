import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Pedido, PedidoService } from '../../services/pedido.service';
import { ClienteService } from '../../services/cliente.service';
import { Observable } from 'rxjs';

// RecaptchaVerifier vem do SDK firebase/compat (registrado globalmente via main.ts: import 'firebase/compat/auth')
declare const firebase: any;

@Component({
  selector: 'app-meus-pedidos',
  templateUrl: './meus-pedidos.page.html',
  styleUrls: ['./meus-pedidos.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, HeaderComponent, BottomNavComponent]
})
export class MeusPedidosPage implements OnInit {
  showModal = false;
  telefone = '';
  codPais = '+55';
  formatado = '';

  logado = false;
  pedidos$: Observable<Pedido[]> | null = null;

  // SMS
  codigo = '';
  confirmation: any = null;
  etapa: 'telefone' | 'codigo' = 'telefone';
  enviando = false;

  constructor(
    private afAuth: AngularFireAuth,
    private pedidoService: PedidoService,
    private clienteService: ClienteService
  ) {}

  ngOnInit() {
    // Se já autenticado por SMS nesta sessão, carrega direto
    this.afAuth.authState.subscribe(u => {
      if (u && this.logado) {
        this.carregarPedidos(this.clienteService.normalizarTelefone(this.telefone));
      }
    });
  }

  abrirModal() {
    this.showModal = true;
    this.etapa = 'telefone';
    this.codigo = '';
    this.confirmation = null;
  }

  // Máscara: +55 (21) 9 9999-9999
  formatar() {
    let t = (this.telefone || '').replace(/\D/g, '');
    if (this.codPais === '+55') {
      if (t.length > 11) t = t.slice(0, 11);
      const ddd = t.slice(0, 2);
      const resto = t.slice(2);
      let s = '';
      if (resto.length <= 5) s = resto;
      else s = resto.slice(0, 5) + '-' + resto.slice(5);
      this.formatado = t.length > 2 ? `(${ddd}) ${s}` : ddd;
    } else {
      this.formatado = t;
    }
  }

  toggleCodPais() {
    this.codPais = this.codPais === '+55' ? '+1' : '+55';
  }

  async enviarSms() {
    const tel = (this.codPais + (this.telefone || '').replace(/\D/g, '')).replace('+', '');
    if (tel.length < 10) return;
    this.enviando = true;
    try {
      const verifier = new firebase.auth.RecaptchaVerifier('recaptcha-meuspedidos', {
        size: 'invisible',
        callback: () => { /* reCAPTCHA resolvido */ }
      });
      const confirmationResult = await this.afAuth.signInWithPhoneNumber('+' + tel, verifier);
      this.confirmation = confirmationResult;
      this.etapa = 'codigo';
    } catch (e: any) {
      console.error('Erro SMS', e?.code || e);
      const msg = e?.code === 'auth/invalid-phone-number'
        ? 'Número de telefone inválido. Use DDI + DDD + número.'
        : e?.code === 'auth/captcha-check-failed'
        ? 'Falha no reCAPTCHA. Recarregue a página e tente novamente.'
        : 'Erro ao enviar SMS. Verifique o número e se o Phone Auth está ativo no Firebase (Authentication > Sign-in method).';
      alert(msg);
    } finally {
      this.enviando = false;
    }
  }

  async confirmarSms() {
    if (!this.confirmation || !this.codigo) return;
    try {
      await this.confirmation.confirm(this.codigo);
      this.logado = true;
      this.formatado = '';
      this.carregarPedidos(this.clienteService.normalizarTelefone(this.codPais + (this.telefone || '').replace(/\D/g, '')));
      this.showModal = false;
    } catch (e) {
      alert('Código inválido.');
    }
  }

  carregarPedidos(tel: string) {
    this.pedidos$ = this.pedidoService.getPedidosByTelefone(tel);
  }
}
