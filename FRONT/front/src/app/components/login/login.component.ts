import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  public authService = inject(AuthService);
  public chatService = inject(ChatService);
  private router = inject(Router);
  public route = inject(ActivatedRoute); 
  private cdr = inject(ChangeDetectorRef);

  isLoginMode = true; 
  hidePassword = true;
  
  formData = {
    email: '',
    motDePasse: ''
  };

  messageErreur = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        const token = params['token'];
        const id = params['id'] || '0';
        const role = params['role'] || 'ROLE_USER';
        const email = params['email'] || 'social_user@ia.com';
        const backend = params['backend']; // 👉 On récupère l'identité du serveur

        this.authService.sauvegarderSession(token, role, email, id);

        // 👉 Si le serveur a déclaré son identité, on l'applique immédiatement
        if (backend === 'spring' || backend === 'django') {
          this.chatService.setBackend(backend);
        }

        this.router.navigate(['/chat']);
      }
    });
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    this.messageErreur = '';

    if (this.isLoginMode) {
      this.authService.login(this.formData.email, this.formData.motDePasse).subscribe({
        next: () => {
          this.router.navigate(['/chat']);
        },
        error: () => {
          this.messageErreur = "Identifiants incorrects.";
          this.cdr.detectChanges(); 
        }
      });
    }
  }

  connexionSociale(fournisseur: 'google' | 'github') {
    const baseUrl = this.authService.getBaseUrl(); 
    const backend = this.chatService.getCurrentBackend();

    if (backend === 'django') {
      window.location.href = `${baseUrl}/auth/${fournisseur}/login/?frontend=angular`;
    } else {
      window.location.href = `${baseUrl}/auth/init-social?fournisseur=${fournisseur}&frontend=angular`;
    }
  }
}