import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../environments/environment.development';
import { chatService } from './chat.service';

export interface LoginResponse {
  token: string;
  role: string;
  email: string;
  utilisateurId: string;
}

class AuthServiceImpl {
  private currentUserSubject: BehaviorSubject<LoginResponse | null>;
  public currentUser$: Observable<LoginResponse | null>;

  constructor() {
    const data = sessionStorage.getItem('userSession');
    this.currentUserSubject = new BehaviorSubject<LoginResponse | null>(data ? JSON.parse(data) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  // Permet de dynamiquement retirer le suffixe "/chat" pour attaquer l'authentification
  getBaseUrl(): string {
    const backend = chatService.getCurrentBackend();
    return environment.urls[backend].replace('/chat', '');
  }

  login(email: string, motDePasse: string): Observable<LoginResponse> {
    const baseUrl = this.getBaseUrl();
    const backend = chatService.getCurrentBackend();
    const loginUrl = backend === 'django' ? `${baseUrl}/auth/login/` : `${baseUrl}/auth/login`;

    return new Observable<LoginResponse>(subscriber => {
      fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse })
      })
      .then(async response => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        return response.json();
      })
      .then((res: LoginResponse) => {
        sessionStorage.setItem('userSession', JSON.stringify(res));
        this.currentUserSubject.next(res);
        subscriber.next(res);
        subscriber.complete();
      })
      .catch(err => {
        subscriber.error(err);
      });
    });
  }

  logout() {
    sessionStorage.removeItem('userSession');
    this.currentUserSubject.next(null);
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
  register(data: { email: string; motDePasse: string }): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const backend = chatService.getCurrentBackend();
    
    const registerUrl = backend === 'django' 
      ? `${baseUrl}/auth/register/` 
      : `${baseUrl}/auth/register`;

    return fetch(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(async response => {
      if (!response.ok) {
        const errorText = await response.text();
        let errorObj;
        try { 
          // On essaie de parser l'erreur JSON renvoyée par Spring/Django
          errorObj = JSON.parse(errorText); 
        } catch (e) { 
          errorObj = { message: errorText }; 
        }
        throw errorObj;
      }
      return response.json();
    });
  }
}

// Exportation de l'instance sous forme de Singleton pour React
export const AuthService = new AuthServiceImpl();