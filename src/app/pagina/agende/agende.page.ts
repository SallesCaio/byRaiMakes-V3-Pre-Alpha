import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CarrinhoService, ItemCarrinho } from '../../carrinho.service';
import { PedidoService, Pedido, PedidoItem } from '../../services/pedido.service';
import { ClienteService, Cliente, EnderecoCliente, ConfigMimo } from '../../services/cliente.service';
import { ViaCepService } from '../../services/viacep.service';
import { FeedbackService } from '../../services/feedback.service';
import { AuthService } from '../../services/auth.service';
import { AdminSessionService } from '../../services/admin-session.service';
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
  mimoIncluso = true;

  // CEP / ViaCEP
    clienteCep = '';
    cepBuscando = false;
    cepErro = '';

  // Feedback pós-pedido
  showFeedback = false;
  feedbackNota = 5;
  feedbackTexto = '';
  pedidoFinalizadoId = '';
  feedbackTelefone = '';

  salvando = false;

  // Termos/Privacidade (H0.9.2)
  termosAceitos = false;
  termosVersao = '2026-08-27';
  termosAceitosEm: Date | null = null;
  showTermos = false;

  constructor(
    private carrinho: CarrinhoService,
    public nav: NavController,
    private afAuth: AngularFireAuth,
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private viaCep: ViaCepService,
    private feedbackService: FeedbackService,
    private authService: AuthService,
    private adminSession: AdminSessionService
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

  openAdmin() {
    this.nav.navigateForward(this.adminSession.adminTargetUrl());
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
    this.termosAceitos = false;
    this.termosAceitosEm = null;
    this.clientePagamento = 'Pix';
    this.clienteCep = '';
  }

  // Passo 1 -> verifica se já é cliente recorrente (não bloqueia o fluxo)
  async verificarTelefone() {
    if (!this.clienteTelefone) return;
    const tel = this.clienteService.normalizarTelefone(this.clienteTelefone);
    try {
      const cliente = await this.clienteService.getClienteOnce(tel);
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
    } catch (e) {
      // Falha na consulta não deve impedir o checkout
      this.clienteExistente = null;
      this.enderecos = [];
      this.usandoNovoEndereco = true;
    }
    this.telefoneVerificado = true;
  }

  // Busca CEP via botão explícito (além do auto no (ionInput))
  buscarCepManual() {
    const cep = (this.clienteCep || '').replace(/\D/g, '');
    if (cep.length === 8) this.buscarCep();
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

  // Helpers de UI (evita regex inline no template)
  cepPronto(): boolean {
    return (this.clienteCep || '').replace(/\D/g, '').length === 8;
  }

  descontoAtual(): number {
    const tem = this.clientePagamento === 'Pix' || this.clientePagamento === 'Dinheiro';
    return tem ? Math.min(this.total * 0.1, 15) : 0;
  }

  totalComDesconto(): number {
    return this.total - this.descontoAtual();
  }

  formatarTelefone() {
    let t = (this.clienteTelefone || '').replace(/\D/g, '');
    if (t.length > 11) t = t.slice(0, 11);
    let f = t;
    if (t.length > 2) f = `(${t.slice(0, 2)}) ${t.slice(2)}`;
    if (t.length > 7) f = `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
    this.clienteTelefone = f;
  }

  // CEP: formata enquanto digita (NAO busca automaticamente para evitar loop de alert)
    formatarCep() {
      let c = (this.clienteCep || '').replace(/\D/g, '');
      if (c.length > 8) c = c.slice(0, 8);
      if (c.length > 5) c = c.slice(0, 5) + '-' + c.slice(5);
      this.clienteCep = c;
    }

    buscarCep() {
      const cep = (this.clienteCep || '').replace(/\D/g, '');
      if (cep.length !== 8) return;
      this.cepBuscando = true;
      this.cepErro = '';
      this.viaCep.buscar(cep).subscribe(res => {
        this.cepBuscando = false;
        if (res && !res.erro) {
          this.novoEndereco.cep = res.cep;
          this.novoEndereco.rua = res.logradouro;
          this.novoEndereco.bairro = res.bairro;
          if (res.complemento) this.novoEndereco.complemento = res.complemento;
        } else {
          this.novoEndereco.cep = cep;
          this.cepErro = 'CEP n\u00e3o encontrado. Preencha o endere\u00e7o manualmente.';
        }
      }, () => {
        this.cepBuscando = false;
        this.novoEndereco.cep = cep;
        this.cepErro = 'Erro ao buscar CEP. Verifique sua conex\u00e3o e preencha manualmente.';
      });
    }

  get podeConfirmar(): boolean {
    if (!this.clienteTelefone || !this.clienteNome.trim()) return false;
    if (this.usandoNovoEndereco) {
      const e = this.novoEndereco;
      if (!e.rua || !e.num || !e.bairro) return false;
    } else if (this.enderecos.length === 0) {
      return false;
    }
    if (!this.termosAceitos) return false;
    return true;
  }

  async confirmarPedido() {
    if (!this.podeConfirmar || this.itens.length === 0) return;

    this.salvando = true;
    const temDesconto = this.clientePagamento === 'Pix' || this.clientePagamento === 'Dinheiro';
    // Desconto de 10%, limitado a R$ 15,00 para proteger margem
    const descontoValor = temDesconto ? Math.min(this.total * 0.1, 15) : 0;
    const valorFinal = this.total - descontoValor;
    const tel = this.clienteService.normalizarTelefone(this.clienteTelefone);

    try {
      const userId = await this.authService.ensureAnonymous();
      if (!userId) {
        throw new Error('auth-failed');
      }
      // Registra timestamp do aceite dos termos no momento efetivo do aceite
      if (this.termosAceitos && !this.termosAceitosEm) {
        this.termosAceitosEm = new Date();
      }

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
        consentimentoLGPD: true,
        termosAceitos: this.termosAceitos,
        termosVersao: this.termosVersao,
        termosAceitosEm: this.termosAceitos ? (this.termosAceitosEm || new Date()) : null
      };
      await this.clienteService.salvarCliente(clienteDoc);
      console.log('[checkout] salvarCliente ok');
      await this.clienteService.registrarPedido(tel, valorFinal);
      console.log('[checkout] registrarPedido ok');

      const pedidoItens: PedidoItem[] =
        this.itens.map(i => ({
          id: i.id,
          nome: i.nome,
          preco: i.preco,
          img: i.img,
          qtd: i.qtd,
          subtotal: i.preco * i.qtd
        }));

      // Itens reais (sem mimo) para a mensagem do WhatsApp — cópia antes do push do mimo
      const itensMensagem: PedidoItem[] = [...pedidoItens];

      // Mimo como item do pedido (se marcado) — gravado no pedido, NÃO na mensagem
      const mimoTxt = (this.mimo?.ativo && this.mimoIncluso) ? (this.mimo.descricao || 'Mimo Surpresa') : '';
      if (mimoTxt) {
        pedidoItens.push({ id: 'mimo', nome: `🎁 ${mimoTxt}`, preco: 0, img: '', qtd: 1, subtotal: 0 });
      }

      console.log('[checkout] criarPedido start', { userId, tel, valorFinal, itens: pedidoItens.length });
      const pedidoId = await this.pedidoService.criarPedido({
        userId,
        produtos: pedidoItens,
        total: this.total,
        desconto: descontoValor,
        totalComDesconto: valorFinal,
        status: 'pendente',
        clienteTelefone: tel,
        clienteNome: this.clienteNome.trim(),
        clienteEndereco: this.enderecoEntrega,
        formaPagamento: this.clientePagamento,
        mimo: mimoTxt,
        termosAceitosEm: this.termosAceitosEm || (this.termosAceitos ? new Date() : null)
      } as Omit<Pedido, 'id' | 'createdAt' | 'updatedAt'>);
      console.log('[checkout] criarPedido ok', pedidoId);

      // Monta mensagem WhatsApp (estrutura V2: %0A literal, sem encode duplo)
      let msg = '🛍️ *NOVO PEDIDO - byRaiMakes*%0A%0A';
      msg += `👤 *Cliente:* ${this.clienteNome || 'Nao informado'}%0A`;
      msg += `📞 *Tel:* ${tel}%0A`;
      msg += `📍 *Endereco:* ${this.enderecoEntrega || 'Nao informado'}%0A`;
      msg += `💳 *Pagamento:* ${this.clientePagamento}%0A%0A`;
      msg += '📋 *Itens:*%0A';
      itensMensagem.forEach((i) => {
        msg += `  • ${i.nome} (x${i.qtd}) — R$ ${(i.preco * i.qtd).toFixed(2)}%0A`;
      });
      msg += `%0A💰 *Subtotal:* R$ ${this.total.toFixed(2)}%0A`;
      if (temDesconto) {
        msg += `🎉 *Desconto ${this.clientePagamento} (10%):* -R$ ${descontoValor.toFixed(2)}%0A`;
      }
      msg += `✅ *Total a pagar:* R$ ${valorFinal.toFixed(2)}%0A%0A`;
      msg += '_Consulte disponibilidade e area de entrega_';

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

    } catch (error: any) {
      const code = error?.code || error?.message || 'unknown';
      console.error('Erro ao criar pedido:', code);
      if (code === 'auth/operation-not-allowed') {
        alert('Anonymous Auth não está ativado no Firebase. Ative em Authentication > Sign-in method.');
      } else if (code === 'permission-denied') {
        alert('Permissão negada ao salvar dados. Verifique se você está conectado à internet.');
      } else {
        alert('Erro ao processar pedido. Tente novamente.');
      }
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
