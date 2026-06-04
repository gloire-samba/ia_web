import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ServeurService } from '../../services/serveur.service';
import { AuthService } from '../../services/auth.service';
import { UtilisateurService } from '../../services/utilisateur.service';

@Component({
  selector: 'app-admin-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-utilisateurs.component.html'
})
export class AdminUtilisateursComponent implements OnInit {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);
  private authService = inject(AuthService);
  private utilisateurService = inject(UtilisateurService);
  
  utilisateurs: any[] = [];

  // 👉 Variables de filtres
  filtreId: string = '';
  filtreEmail: string = '';
  filtreRole: string = '';

  ngOnInit() { this.chargerUtilisateurs(); }

  chargerUtilisateurs() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`${this.serveurService.getApiUrl()}/utilisateurs`, { headers }).subscribe((data: any) => {
      const currentEmail = this.authService.getUserFromStorage()?.email;
      const liste = data.results || data.content || data._embedded?.utilisateurs || data;
      this.utilisateurs = liste.filter((u: any) => u.email !== currentEmail);
    });
  }

  changerRole(utilisateur: any) {
    if(confirm(`Changer le rôle de ${utilisateur.email} en ${utilisateur.role} ?`)) {
      this.utilisateurService.modifierRole(utilisateur.id, utilisateur.role).subscribe(() => {
        alert('Rôle mis à jour avec succès.');
      });
    }
  }

  supprimerUtilisateur(id: number) {
    if(confirm('Es-tu sûr de vouloir supprimer cet utilisateur ?')) {
      this.utilisateurService.supprimer(id).subscribe(() => {
        this.chargerUtilisateurs();
      });
    }
  }

  // 👉 Le Getter qui filtre les données pour le HTML
  get utilisateursFiltres() {
    return this.utilisateurs.filter(u => {
      const matchId = u.id.toString().includes(this.filtreId);
      const matchEmail = u.email.toLowerCase().includes(this.filtreEmail.toLowerCase());
      const matchRole = this.filtreRole === '' || u.role === this.filtreRole;
      return matchId && matchEmail && matchRole;
    });
  }
}