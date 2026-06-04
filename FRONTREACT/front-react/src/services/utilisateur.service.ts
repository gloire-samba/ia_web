import { serveurService } from './serveur.service';
import { authService } from './auth.service';

class UtilisateurService {
  
  async getTous() {
    const res = await fetch(`${serveurService.getApiUrl()}/utilisateurs`, {
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
    if (!res.ok) throw new Error("Erreur de récupération");
    return res.json();
  }

  async modifierRole(id: number, role: string) {
    const isDjango = serveurService.getBackend() === 'django';
    const suffix = isDjango ? '/' : '';
    
    const res = await fetch(`${serveurService.getApiUrl()}/utilisateurs/${id}${suffix}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        // 👉 Passeport de sécurité ajouté
        'Authorization': `Bearer ${authService.getToken()}` 
      },
      body: JSON.stringify({ role })
    });
    return res.json();
  }

  async supprimer(id: number) {
    const isDjango = serveurService.getBackend() === 'django';
    const suffix = isDjango ? '/' : '';
    
    await fetch(`${serveurService.getApiUrl()}/utilisateurs/${id}${suffix}`, {
      method: 'DELETE',
      // 👉 Passeport de sécurité ajouté pour la suppression
      headers: { 'Authorization': `Bearer ${authService.getToken()}` }
    });
  }
}

export const utilisateurService = new UtilisateurService();