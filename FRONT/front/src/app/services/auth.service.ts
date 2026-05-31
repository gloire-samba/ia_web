import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { ChatService } from './chat.service'; // On utilise ChatService pour récupérer le backend actif
import { environment } from '../../environments/environment.development';

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
  private chatService = inject(ChatService);

  private currentUserSubject = new BehaviorSubject<LoginResponse | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private getUserFromStorage(): LoginResponse | null {
    const data = sessionStorage.getItem('userSession');
    return data ? JSON.parse(data) : null;
  }

  // Astuce : On retire "/chat" de l'URL du backend pour taper sur la racine de l'API
  getBaseUrl(): string {
    const backendUrl = environment.urls[this.chatService.getCurrentBackend()];
    return backendUrl.replace('/chat', ''); 
  }

  login(email: string, motDePasse: string) {
    const baseUrl = this.getBaseUrl();
    const isDjango = this.chatService.getCurrentBackend() === 'django';
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

  // 👉 NOUVELLE FONCTION MANQUANTE POUR L'INSCRIPTION
  register(data: { email: string; motDePasse: string }) {
    const baseUrl = this.getBaseUrl();
    // On récupère le backend actif via ChatService (que tu as déjà injecté)
    const backend = this.chatService.getCurrentBackend();
    
    // Django est capricieux avec les slashs à la fin des URL
    const registerUrl = backend === 'django' 
      ? `${baseUrl}/auth/register/` 
      : `${baseUrl}/auth/register`;

    return this.http.post(registerUrl, data);
  }
}