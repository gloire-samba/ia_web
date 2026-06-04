import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { ServeurService } from './serveur.service'; // 👉 Nouvel import

export interface LoginResponse {
  token: string;
  role: string;
  email: string;
  utilisateurId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private serveurService = inject(ServeurService); // 👉 On injecte ServeurService

  private currentUserSubject = new BehaviorSubject<LoginResponse | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  public getUserFromStorage(): LoginResponse | null {
    const data = sessionStorage.getItem('userSession');
    return data ? JSON.parse(data) : null;
  }

  getBaseUrl(): string {
    return this.serveurService.getApiUrl(); // 👉 Utilise ServeurService
  }

  // 👉 LES DEUX FONCTIONS MANQUANTES QUI FAISAIENT PLANTER app.component.html
  getRole(): string | null {
    return this.currentUserSubject.value?.role || null;
  }

  getUserId(): string | null {
    return this.currentUserSubject.value?.utilisateurId || null;
  }

  login(email: string, motDePasse: string) {
    const baseUrl = this.getBaseUrl();
    const isDjango = this.serveurService.getBackend() === 'django';
    const loginUrl = `${baseUrl}/auth/login${isDjango ? '/' : ''}`;

    return this.http.post<LoginResponse>(loginUrl, { email, motDePasse }).pipe(
      tap(res => {
        sessionStorage.setItem('userSession', JSON.stringify(res));
        this.currentUserSubject.next(res);
      })
    );
  }

  logout() {
    sessionStorage.removeItem('userSession');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.currentUserSubject.value?.token || null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  sauvegarderSession(token: string, role: string, email: string, utilisateurId: string) {
    const res: LoginResponse = { token, role, email, utilisateurId };
    sessionStorage.setItem('userSession', JSON.stringify(res));
    this.currentUserSubject.next(res);
  }

  register(data: { email: string; motDePasse: string }) {
    const backend = this.serveurService.getBackend();
    const registerUrl = backend === 'django' 
      ? `${this.getBaseUrl()}/auth/register/` 
      : `${this.getBaseUrl()}/auth/register`;

    return this.http.post(registerUrl, data);
  }
}