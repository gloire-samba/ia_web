import { serveurService } from './serveur.service';

export interface LoginResponse {
  token: string;
  role: string;
  email: string;
  utilisateurId: string;
}

class AuthService {
  
  getBaseUrl(): string {
    return serveurService.getApiUrl();
  }

  getUserFromStorage(): LoginResponse | null {
    const data = sessionStorage.getItem('userSession');
    return data ? JSON.parse(data) : null;
  }

  getRole(): string | null {
    return this.getUserFromStorage()?.role || null;
  }

  getUserId(): string | null {
    return this.getUserFromStorage()?.utilisateurId || null;
  }

  isLoggedIn(): boolean {
    return this.getUserFromStorage() !== null;
  }

  // 👉 FONCTION AJOUTÉE ICI :
  getToken(): string | null {
    return this.getUserFromStorage()?.token || null;
  }

  async login(email: string, motDePasse: string): Promise<LoginResponse> {
    const isDjango = serveurService.getBackend() === 'django';
    const loginUrl = `${this.getBaseUrl()}/auth/login${isDjango ? '/' : ''}`;

    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse })
    });

    if (!res.ok) throw new Error("Identifiants incorrects");
    
    const data = await res.json();
    sessionStorage.setItem('userSession', JSON.stringify(data));
    return data;
  }

  async register(data: { email: string; motDePasse: string }) {
    const isDjango = serveurService.getBackend() === 'django';
    const registerUrl = isDjango 
      ? `${this.getBaseUrl()}/auth/register/` 
      : `${this.getBaseUrl()}/auth/register`;

    const res = await fetch(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Erreur lors de l'inscription");
    }
    return res.json();
  }

  logout() {
    sessionStorage.removeItem('userSession');
    window.location.href = '/login';
  }

  sauvegarderSession(token: string, role: string, email: string, utilisateurId: string) {
    sessionStorage.setItem('userSession', JSON.stringify({ token, role, email, utilisateurId }));
  }
}

export const authService = new AuthService();