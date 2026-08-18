import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CarrinhoService, ItemCarrinho } from '../../carrinho.service';
import { PedidoService, Pedido, PedidoItem } from '../../services/pedido.service';
import { ClienteService, Cliente, EnderecoCliente, ConfigMimo } from '../../services/cliente.service';
import { ViaCepService } from '../../services/viacep.service';
import { FeedbackService } from '../../services/feedback.service';
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

  // Passo 1: telefone
  clienteTelefone = '';
  telefoneVerificado = false;
  clienteExistente: Cliente | null = null;

  // Passo 2: dados (recorrente pré-preenche)
  clienteNome = '';
  enderecos: EnderecoCliente[] = [];
  enderecoSelecionado = 0;
  // form de novo endereço (quando recorrente ou novo)
  novoEndereco: EnderecoCliente = { apelido: '', rua: '', num: '', bairro: '', cep: '' };
  usandoNovoEndereco = false;

  clientePagamento: 'Pix' | 'Dinheiro' | 'Cartão' = 'Pix';
  consentimentoLGPD = false;

  // Mimo
  mimo: ConfigMimo | null = null;

  // CEP / ViaCEP
  clienteCep = '';
  cepBuscando = false;

  // Feedback pós-pedido
  showFeedback = false;
  feedbackNota = 5;
  feedbackTexto = '';
  pedidoFinalizadoId = '';
  feedbackTelefone = '';

  salvando = false;

  constructor(
    private carrinho: CarrinhoService,
    public nav: NavController,
    private afAuth: AngularFireAuth,
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private viaCep: ViaCepService,
    private feedbackService: FeedbackService
  ) { }

  ngOnInit() {
    this.clienteService.getMimo().then(m => this.mimo = m);
  }

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
    this.resetCheckout();
    this.showCheckout = true;
  }

  resetCheckout() {
    this.clienteTelefone = '';
    this.telefoneVerificado = false;
    this.clienteExistente = null;
    this.clienteNome = '';
    this.enderecos = [];
    this.enderecoSelecionado = 0;
    this.novoEndereco = { apelido: '', rua: '', num: '', bairro: '', cep: '' };
    this.usandoNovoEndereco = false;
    this.consentimentoLGPD = false;
    this.clientePagamento = 'Pix';
    this.clienteCep = '';
  }

  // Passo 1 -> verifica se já é cliente recorrente
  async verificarTelefone() {
    if (!this.clienteTelefone) return;
    const tel = this.clienteService.normalizarTelefone(this.clienteTelefone);
    const cliente = await this.clienteService.getClienteOnce(tel);
    this.telefoneVerificado = true;
    if (cliente) {
      this.clienteExistente = cliente;
      this.clienteNome = cliente.nome;
      this.enderecos = cliente.enderecos || [];
      this.enderecoSelecionado = 0;
      this.usandoNovoEndereco = this.enderecos.length === 0;
    } else {
      this.clienteExistente = null;
      this.clienteNome = '';
      this.enderecos = [];
      this.usandoNovoEndereco = true;
    }
  }

  get enderecoEntrega(): string {
    if (this.usandoNovoEndereco) {
      const e = this.novoEndereco;
      return [e.rua, e.num, e.bairro, e.cep].filter(Boolean).join(', ');
    }
    const e = this.enderecos[this.enderecoSelecionado];
    if (!e) return '';
    return [e.rua, e.num, e.bairro, e.cep].filter(Boolean).join(', ');
  }

  // Máscara de telefone em tempo real: (21) 97730-3208 — apenas separadores, sem prefixo fixo
  formatarTelefone() {
    let t = (this.clienteTelefone || '').replace(/\D/g, '');
    if (t.length > 11) t = t.slice(0, 11);
    let f = t;
    if (t.length > 2) f = `(${t.slice(0, 2)}) ${t.slice(2)}`;
    if (t.length > 7) f = `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
    this.clienteTelefone = f;
  }

  // CEP: formata enquanto digita + busca ViaCEP
  formatarCep() {
    let c = (this.clienteCep || '').replace(/\D/g, '');
    if (c.length > 8) c = c.slice(0, 8);
    if (c.length > 5) c = c.slice(0, 5) + '-' + c.slice(5);
    this.clienteCep = c;
    if (c.replace(/\D/g, '').length === 8) this.buscarCep();
  }

  buscarCep() {
    const cep = (this.clienteCep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    this.cepBuscando = true;
    this.viaCep.buscar(cep).subscribe(res => {
      this.cepBuscando = false;
      if (res && !res.erro) {
        this.novoEndereco.cep = res.cep;
        this.novoEndereco.rua = res.logradouro;
        this.novoEndereco.bairro = res.bairro;
        if (res.complemento) this.novoEndereco.complemento = res.complemento;
      } else {
        // CEP não encontrado: mantém o que usuário digitou
        this.novoEndereco.cep = cep;
      }
    }, () => { this.cepBuscando = false; this.novoEndereco.cep = cep; });
  }

  get podeConfirmar(): boolean {
    if (!this.clienteTelefone || !this.clienteNome.trim()) return false;
    if (this.usandoNovoEndereco) {
      const e = this.novoEndereco;
      if (!e.rua || !e.num || !e.bairro) return false;
    } else if (this.enderecos.length === 0) {
      return false;
    }
    if (!this.consentimentoLGPD) return false;
    return true;
  }

  async confirmarPedido() {
    if (!this.podeConfirmar || this.itens.length === 0) return;

    this.salvando = true;
    const desconto = this.clientePagamento === 'Pix' || this.clientePagamento === 'Dinheiro';
    const valorFinal = desconto ? this.total * 0.9 : this.total;
    const tel = this.clienteService.normalizarTelefone(this.clienteTelefone);

    try {
      const user = await this.afAuth.currentUser;
      const userId = user?.uid || 'anonimo';

      // Salva/atualiza cliente + endereço
      const enderecoParaSalvar: EnderecoCliente = this.usandoNovoEndereco
        ? { ...this.novoEndereco }
        : this.enderecos[this.enderecoSelecionado];

      const clienteDoc: Cliente = {
        telefone: tel,
        nome: this.clienteNome.trim(),
        enderecos: this.usandoNovoEndereco
          ? [...this.enderecos, enderecoParaSalvar]
          : this.enderecos,
        totalPedidos: (this.clienteExistente?.totalPedidos || 0),
        valorTotal: (this.clienteExistente?.valorTotal || 0),
        consentimentoLGPD: true
      };
      await this.clienteService.salvarCliente(clienteDoc);
      await this.clienteService.registrarPedido(tel, valorFinal);

      const pedidoItens: PedidoItem[] =
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
        clienteTelefone: tel,
        clienteNome: this.clienteNome.trim(),
        clienteEndereco: this.enderecoEntrega,
        formaPagamento: this.clientePagamento,
        mimo: this.mimo?.ativo ? (this.mimo.descricao || 'Amostra grátis inclusa') : ''
      } as Omit<Pedido, 'id' | 'createdAt' | 'updatedAt'>);

      console.log('Pedido criado com ID:', pedidoId);

      // Monta mensagem WhatsApp (sem emoji; encode seguro p/ URL)
      const linhas: string[] = [];
      linhas.push('*NOVO PEDIDO - byRaiMakes*');
      linhas.push('');
      linhas.push(`Pedido: #${(pedidoId || '').slice(-6).toUpperCase()}`);
      linhas.push(`Cliente: ${this.clienteNome || 'Nao informado'}`);
      linhas.push(`Tel: ${tel}`);
      linhas.push(`Endereco: ${this.enderecoEntrega || 'Nao informado'}`);
      linhas.push(`Pagamento: ${this.clientePagamento}`);
      linhas.push('');
      linhas.push('Itens:');
      this.itens.forEach((i) => {
        linhas.push(`  - ${i.nome} (x${i.qtd}) - R$ ${(i.preco * i.qtd).toFixed(2)}`);
      });
      linhas.push('');
      linhas.push(`Subtotal: R$ ${this.total.toFixed(2)}`);
      if (desconto) {
        linhas.push(`Desconto ${this.clientePagamento} (10%): -R$ ${(this.total * 0.1).toFixed(2)}`);
      }
      linhas.push(`Total a pagar: R$ ${valorFinal.toFixed(2)}`);
      const mimoTxt = this.mimo?.ativo ? (this.mimo.descricao || 'Amostra gratis inclusa') : '';
      if (mimoTxt) {
        linhas.push('');
        linhas.push(`MIMO GRATIS: ${mimoTxt}`);
      }
      linhas.push('');
      linhas.push('Consulte disponibilidade e area de entrega');

      const msg = encodeURIComponent(linhas.join('\n'));
      const url = `https://wa.me/${this.whatsapp}?text=${msg}`;
      window.open(url, '_blank');

      // Modal de sucesso com ID do pedido
      this.pedidoFinalizadoId = pedidoId;
      this.carrinho.limpar();
      this.showCheckout = false;
      this.atualizar();
      this.showFeedback = true;
      // guarda o tel normalizado p/ o feedback (reset zera clienteTelefone)
      this.feedbackTelefone = tel;
      this.resetCheckout();

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao processar pedido. Tente novamente.');
    } finally {
      this.salvando = false;
    }
  }

  async enviarFeedback() {
    if (!this.pedidoFinalizadoId) return;
    try {
      await this.feedbackService.criarFeedback({
        pedidoId: this.pedidoFinalizadoId,
        clienteTelefone: this.feedbackTelefone || this.clienteService.normalizarTelefone(this.clienteTelefone),
        nota: this.feedbackNota,
        comentario: this.feedbackTexto.trim() || undefined
      });
    } catch (e) {
      console.error('Erro ao salvar feedback', e);
    } finally {
      this.showFeedback = false;
    }
  }

}
