import { Component } from '@angular/core';
import { ModalController, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { FirebaseService, Banner } from '../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-banners',
  templateUrl: './banners.page.html',
  styleUrls: ['./banners.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class AdminBannersPage {
  banners$!: Observable<Banner[]>;
  titulo = '';
  subtitulo = '';
  cta = '';
  link = '';
  imagemUrl = '';
  ativo = true;
  ordem = 1;
  editingId: string | null = null;
  previewUrl = '';
  modalOpen = false;
  pendingBannerFile: File | null = null;

  constructor(
    private fb: FirebaseService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    this.banners$ = this.fb.getAllBanners();
  }

  openModal(banner?: Banner) {
    this.editingId = banner?.id ?? null;
    this.titulo = banner?.titulo ?? '';
    this.subtitulo = banner?.subtitulo ?? '';
    this.cta = banner?.cta ?? '';
    this.link = banner?.link ?? '';
    this.ordem = banner?.ordem ?? 1;
    this.ativo = banner?.ativo ?? true;
    this.imagemUrl = banner?.imagemUrl ?? '';
    this.previewUrl = banner?.imagemUrl ?? '';
    this.pendingBannerFile = null;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.editingId = null;
    this.titulo = '';
    this.subtitulo = '';
    this.cta = '';
    this.link = '';
    this.imagemUrl = '';
    this.ativo = true;
    this.ordem = 1;
    this.previewUrl = '';
    this.pendingBannerFile = null;
  }

  async salvar() {
    if (!this.titulo.trim()) {
      const alert = await this.alertCtrl.create({
        header: 'Campo obrigatório',
        message: 'O título é obrigatório.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    if (!this.ordem || this.ordem < 1) {
      const alert = await this.alertCtrl.create({
        header: 'Ordem inválida',
        message: 'A ordem deve ser um número maior que zero.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    if (!this.editingId && !this.imagemUrl && !this.pendingBannerFile) {
      const alert = await this.alertCtrl.create({
        header: 'Imagem obrigatória',
        message: 'Selecione uma imagem para o banner.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingCtrl.create({ message: this.editingId ? 'Atualizando...' : 'Criando...' });
    await loading.present();

    try {
      if (this.pendingBannerFile) {
        const nome = `${Date.now()}_${this.pendingBannerFile.name}`;
        this.imagemUrl = await this.fb.uploadImage(this.pendingBannerFile, `banners/${nome}`);
        this.previewUrl = this.imagemUrl;
      }

      if (this.editingId) {
        await this.fb.updateBanner(this.editingId, {
          titulo: this.titulo,
          subtitulo: this.subtitulo,
          cta: this.cta,
          link: this.link,
          imagemUrl: this.imagemUrl,
          ativo: this.ativo,
          ordem: this.ordem
        });
      } else {
        await this.fb.createBanner({
          titulo: this.titulo,
          subtitulo: this.subtitulo,
          cta: this.cta,
          link: this.link,
          imagemUrl: this.imagemUrl,
          ativo: this.ativo,
          ordem: this.ordem
        });
      }

      this.closeModal();
      const toast = await this.toastCtrl.create({
        message: 'Banner salvo',
        duration: 2000,
        color: 'success'
      });
      toast.present();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const toast = await this.toastCtrl.create({
        message: 'Erro ao salvar banner',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async excluir(banner: Banner) {
    const confirm = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: `Deseja excluir o banner "${banner.titulo}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: async () => {
            try {
              await this.fb.deleteBanner(banner.id!);
              const toast = await this.toastCtrl.create({
                message: 'Banner excluído',
                duration: 2000,
                color: 'success'
              });
              toast.present();
            } catch (err) {
              console.error('Erro ao excluir:', err);
              const toast = await this.toastCtrl.create({
                message: 'Erro ao excluir banner',
                duration: 2000,
                color: 'danger'
              });
              toast.present();
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  async toggleAtivo(banner: Banner) {
    const novo = !banner.ativo;
    await this.fb.updateBanner(banner.id!, { ativo: novo });
    banner.ativo = novo;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingBannerFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
}
