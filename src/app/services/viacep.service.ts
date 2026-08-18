import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ViaCepService {
  constructor(private http: HttpClient) {}

  buscar(cepRaw: string): Observable<ViaCepResponse> {
    const cep = (cepRaw || '').replace(/\D/g, '');
    const url = `https://viacep.com.br/ws/${cep}/json/`;
    return this.http.get<ViaCepResponse>(url);
  }
}
