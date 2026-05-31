import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si l'utilisateur est connecté, on le laisse passer vers le Chat
  if (authService.isLoggedIn()) {
    return true;
  }
  
  // Sinon, redirection immédiate vers la page de connexion
  router.navigate(['/login']);
  return false;
};