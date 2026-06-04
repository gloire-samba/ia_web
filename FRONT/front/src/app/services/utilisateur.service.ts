import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // 👉 L'outil qui génère le passeport de sécurité
  private getHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  getTous() {
    return this.http.get(`${this.authService.getBaseUrl()}/utilisateurs`, { headers: this.getHeaders() });
  }

  modifierRole(id: number, role: string) {
    const isDjango = this.authService.getBaseUrl().includes('8000');
    const suffix = isDjango ? '/' : '';
    
    // 👉 On ajoute le header ici
    return this.http.patch(`${this.authService.getBaseUrl()}/utilisateurs/${id}${suffix}`, { role }, { headers: this.getHeaders() });
  }

  supprimer(id: number) {
    const isDjango = this.authService.getBaseUrl().includes('8000');
    const suffix = isDjango ? '/' : '';
    
    // 👉 Et on ajoute le header ici pour autoriser la suppression !
    return this.http.delete(`${this.authService.getBaseUrl()}/utilisateurs/${id}${suffix}`, { headers: this.getHeaders() });
  }
}