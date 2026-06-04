import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { ServeurService, BackendType } from './services/serveur.service'; // 👉 Import mis à jour
import { AuthService } from './services/auth.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink], 
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private serveurService = inject(ServeurService); // 👉 Utilise ServeurService
  private router = inject(Router);
  public authService = inject(AuthService); 

  get serveurActif(): BackendType {
    return this.serveurService.getBackend();
  }

  changerServeur(backend: BackendType) {
    this.authService.logout(); 
    this.serveurService.setBackend(backend);
    this.router.navigate(['/login']);
  }

  basculerVersReact() {
    this.authService.logout();
    window.location.href = 'http://localhost:5173/';
  }

  // 👉 LA FONCTION MANQUANTE EST REMISE ICI
  deconnexion() {
    this.authService.logout();
  }
}