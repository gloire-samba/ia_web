import { environment } from '../environments/environment.development';

export type BackendType = 'spring' | 'django';

class ServeurService {
  private currentBackend: BackendType;

  constructor() {
    const savedBackend = sessionStorage.getItem('activeBackend') as BackendType;
    this.currentBackend = savedBackend || 'spring';
    console.log(`🔌 ServeurService initialisé sur le backend : ${this.currentBackend.toUpperCase()}`);
  }

  setBackend(backend: BackendType) {
    this.currentBackend = backend;
    sessionStorage.setItem('activeBackend', backend);
  }

  getBackend(): BackendType {
    return this.currentBackend;
  }

  // Renvoie l'URL de l'API (ex: http://localhost:8080/api)
  getApiUrl(): string {
    return environment.urls[this.currentBackend].replace('/chat', '');
  }

  // Renvoie l'URL spécifique au Chat (ex: http://localhost:8080/api/chat)
  getChatUrl(): string {
    return environment.urls[this.currentBackend];
  }
}

export const serveurService = new ServeurService();