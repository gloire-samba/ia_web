import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // 👉 Import ajouté pour [(ngModel)]
import { ServeurService } from '../../services/serveur.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-visages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-visages.component.html',
  styles: [`
    .visage-thumbnail { width: 50px; height: 50px; border-radius: 5px; cursor: pointer; object-fit: cover; transition: transform 0.3s; }
    .visage-thumbnail.zoom { transform: scale(4); z-index: 100; position: relative; border: 2px solid #3b82f6; }
  `]
})
export class AdminVisagesComponent implements OnInit {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);
  private authService = inject(AuthService);
  
  visages: any[] = [];
  imageZoomee: number | null = null;

  // 👉 Variables de filtres
  filtreId: string = '';
  filtreNom: string = '';
  filtreChemin: string = '';

  ngOnInit() { this.chargerVisages(); }

  chargerVisages() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any[]>(`${this.serveurService.getApiUrl()}/visages`, { headers }).subscribe(data => this.visages = data);
  }

  getUrlImage(chemin: string): string {
    if (!chemin) return '';
    const nomFichier = chemin.split('/').pop()?.split('\\').pop();
    const rootUrl = this.serveurService.getApiUrl().replace(/\/api$/, '');
    const isDjango = this.serveurService.getBackend() === 'django';
    return isDjango ? `${rootUrl}/media/visages/${nomFichier}` : `${rootUrl}/uploads/visages/${nomFichier}`;
  }

  supprimerVisage(id: number) {
    if(confirm('Supprimer ce visage effacera aussi son vecteur IA. Continuer ?')) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
      const suffix = this.serveurService.getBackend() === 'django' ? '/' : '';
      this.http.delete(`${this.serveurService.getApiUrl()}/visages/${id}${suffix}`, { headers }).subscribe(() => {
        this.chargerVisages();
      });
    }
  }

  // 👉 Le Getter qui filtre les données pour le HTML
  get visagesFiltres() {
    return this.visages.filter(v => {
      const cheminDB = v.chemin_image || v.cheminImage || '';
      const matchId = v.id.toString().includes(this.filtreId);
      const matchNom = v.nom.toLowerCase().includes(this.filtreNom.toLowerCase());
      const matchChemin = cheminDB.toLowerCase().includes(this.filtreChemin.toLowerCase());
      return matchId && matchNom && matchChemin;
    });
  }
}