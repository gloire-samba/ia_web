import { authService } from '../services/auth.service';

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = authService.getToken();
  const headers = new Headers(init?.headers);
  
  // Si un token existe en session, on l'ajoute à la douane
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const modifiedInit: RequestInit = {
    ...init,
    headers,
  };

  return fetch(input, modifiedInit);
};