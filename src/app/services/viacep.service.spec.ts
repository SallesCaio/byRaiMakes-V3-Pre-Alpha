import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ViaCepService } from './viacep.service';

describe('ViaCepService', () => {
  let service: ViaCepService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ViaCepService]
    });
    service = TestBed.inject(ViaCepService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('busca CEP e retorna logradouro/bairro', () => {
    let res: any;
    service.buscar('21941550').subscribe(r => res = r);
    const req = httpMock.expectOne('https://viacep.com.br/ws/21941550/json/');
    expect(req.request.method).toBe('GET');
    req.flush({ cep: '21941-550', logradouro: 'Rua A', bairro: 'Centro', localidade: 'RJ', uf: 'RJ' });
    expect(res.logradouro).toBe('Rua A');
    expect(res.bairro).toBe('Centro');
  });

  it('retorna erro quando CEP inválido (erro: true)', () => {
    let res: any = null;
    let isErro = false;
    service.buscar('00000000').subscribe({
      next: r => { res = r; if (r.erro) isErro = true; },
      error: () => { isErro = true; }
    });
    const req = httpMock.expectOne('https://viacep.com.br/ws/00000000/json/');
    req.flush({ erro: true });
    expect(res.erro).toBe(true);
    expect(isErro).toBe(true);
  });
});
