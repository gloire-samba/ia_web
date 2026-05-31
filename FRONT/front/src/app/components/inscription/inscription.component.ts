import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css']
})
export class InscriptionComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  formData = { email: '', motDePasse: '' };
  messageErreur = '';
  hidePassword = true;
  isLoading = false;

  togglePasswordVisibility() { 
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    if (this.isLoading) return; 

    this.isLoading = true;
    this.messageErreur = '';
    
    // Inscription puis auto-login pour rediriger vers le chat
    this.authService.register(this.formData).subscribe({
      next: () => {
        this.authService.login(this.formData.email, this.formData.motDePasse).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/chat']);
          },
          error: () => {
            this.isLoading = false;
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.messageErreur = err.error?.error || "Erreur lors de l'inscription.";
        this.cdr.detectChanges();
      }
    });
  }
}