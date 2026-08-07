import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CarrinhoService, ItemCarrinho } from '../../carrinho.service';
import { PedidoService, Pedido, PedidoItem } from '../../services/pedido.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-agende',
  templateUrl: './agende.page.html',
  styleUrls: ['./agende.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, HeaderComponent, BottomNavComponent]
})
export class AgendePage implements OnInit {
  itens: ItemCarrinho[] = [];
  total = 0;
  whatsapp = '5521970579631';

  showCheckout = false;
  clienteTelefone = '';
  clienteNome = '';
  clienteEndereco = '';
  clientePagamento: 'Pix' | 'Dinheiro' | 'Cartão' = 'Pix';
  salvando = false;

  constructor(
    private carrinho: CarrinhoService,
    public nav: NavController,
    private afAuth: AngularFireAuth,
    private pedidoService: PedidoService
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.atualizar();
  }

  atualizar() {
    this.itens = this.carrinho.listar();
    this.total = this.carrinho.total();
  }

  remover(id: string) {
    this.carrinho.remover(id);
    this.atualizar();
  }

  openPage(url: string) {
    this.nav.navigateForward(url);
  }

  abrirCheckout() {
    if (this.itens.length === 0) return;
    this.showCheckout = true;
  }

  async confirmarPedido() {
    if (!this.clienteTelefone || this.itens.length === 0) return;

    this.salvando = true;

    const desconto = this.clientePagamento === 'Pix' || this.clientePagamento === 'Dinheiro';
    const valorFinal = desconto ? this.total * 0.9 : this.total;

    try {
      const user = await this.afAuth.currentUser;
      const userId = user?.uid || 'anonimo';

      const pedidoItens: { id: string; nome: string; preco: number; img: string; qtd: number; subtotal: number }[] =
        this.itens.map(i => ({
          id: i.id,
          nome: i.nome,
          preco: i.preco,
          img: i.img,
          qtd: i.qtd,
          subtotal: i.preco * i.qtd
        }));

      const pedidoId = await this.pedidoService.criarPedido({
        userId,
        produtos: pedidoItens,
        total: this.total,
        desconto: desconto ? this.total * 0.1 : 0,
        totalComDesconto: valorFinal,
        status: 'pendente',
        clienteTelefone: this.clienteTelefone,
        clienteNome: this.clienteNome,
        clienteEndereco: this.clienteEndereco,
        formaPagamento: this.clientePagamento
      });

      console.log('Pedido criado com ID:', pedidoId);

      let msg = '🛍️ *NOVO PEDIDO - byRaiMakes*%0A%0A';
      msg += `🆔 *Pedido:* #${pedidoId.slice(-6).toUpperCase()}%0A`;
      msg += `👤 *Cliente:* ${this.clienteNome || 'Nao informado'}%0A`;
      msg += `📞 *Tel:* ${this.clienteTelefone}%0A`;
      msg += `📍 *Endereco:* ${this.clienteEndereco || 'Nao informado'}%0A`;
      msg += `💳 *Pagamento:* ${this.clientePagamento}%0A%0A`;
      msg += '📋 *Itens:*%0A';
      this.itens.forEach((i) => {
        msg += `  • ${i.nome} (x${i.qtd}) — R$ ${(i.preco * i.qtd).toFixed(2)}%0A`;
      });
      msg += `%0A💰 *Subtotal:* R$ ${this.total.toFixed(2)}%0A`;
      if (desconto) {
        msg += `🎉 *Desconto ${this.clientePagamento} (10%):* -R$ ${(this.total * 0.1).toFixed(2)}%0A`;
      }
      msg += `✅ *Total a pagar:* R$ ${valorFinal.toFixed(2)}%0A%0A`;
      msg += '_Consulte disponibilidade e area de entrega_';

      const url = `https://wa.me/${this.whatsapp}?text=${msg}`;
      window.open(url, '_blank');

      this.carrinho.limpar();
      this.showCheckout = false;
      this.atualizar();

      this.clienteTelefone = '';
      this.clienteNome = '';
      this.clienteEndereco = '';
      this.clientePagamento = 'Pix';

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao processar pedido. Tente novamente.');
    } finally {
      this.salvando = false;
    }
  }
}