import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { BackendType, ChatService } from './services/chat.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet], 
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private chatService = inject(ChatService);
  private router = inject(Router);
  public authService = inject(AuthService); // Rendu public pour le HTML

  get serveurActif(): BackendType {
    return this.chatService.getCurrentBackend();
  }

  changerServeur(backend: BackendType) {
    this.authService.logout(); 
    this.chatService.setBackend(backend);
    this.router.navigate(['/login']);
  }

  basculerVersReact() {
    this.authService.logout();
    window.location.href = 'http://localhost:5173/';
  }

  deconnexion() {
    this.authService.logout();
  }
}