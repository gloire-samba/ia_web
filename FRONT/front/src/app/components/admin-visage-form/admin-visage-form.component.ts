import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ServeurService } from '../../services/serveur.service';
import { AuthService } from '../../services/auth.service'; // 👉 Nouvel import

@Component({
  selector: 'app-admin-visage-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-visage-form.component.html',
  styleUrls: ['./admin-visage-form.component.css']
})
export class AdminVisageFormComponent implements OnInit {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  nom: string = '';
  chemin: string = ''; // 👉 Nouveau champ
  fichierSelectionne: File | null = null;
  isEdit = false;
  visageId: string | null = null;

  ngOnInit() {
    this.visageId = this.route.snapshot.paramMap.get('id');
    if (this.visageId) {
      this.isEdit = true;
      const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
      
      this.http.get<any[]>(`${this.serveurService.getApiUrl()}/visages`, { headers }).subscribe(data => {
        const visageActuel = data.find(x => x.id.toString() === this.visageId);
        if (visageActuel) {
          this.nom = visageActuel.nom;
          this.chemin = visageActuel.chemin_image || visageActuel.cheminImage;
        }
      });
    }
  }

  onFileSelected(event: any) {
    this.fichierSelectionne = event.target.files[0];
  }

  onSubmit() {
    const isDjango = this.serveurService.getBackend() === 'django';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);

    if (this.isEdit) {
      // 👉 REQUÊTE DE MODIFICATION (PUT)
      const url = `${this.serveurService.getApiUrl()}/visages/${this.visageId}${isDjango ? '/' : ''}`;
      
      this.http.put(url, { nom: this.nom, chemin_image: this.chemin }, { headers }).subscribe({
        next: () => {
          alert('Modifications sauvegardées avec succès !');
          this.router.navigate(['/admin/visages']);
        },
        error: (err) => alert('Erreur : ' + err.message)
      });

    } else {
      // 👉 REQUÊTE D'AJOUT (POST MULTIPART)
      if (!this.fichierSelectionne || !this.nom) return;

      const formData = new FormData();
      formData.append('nom', this.nom);
      formData.append('image', this.fichierSelectionne);

      // On enlève le /api redondant qui causait l'erreur 404
      const url = `${this.serveurService.getApiUrl()}${isDjango ? '/visages/' : '/visages/ajouter'}`;

      this.http.post(url, formData, { headers }).subscribe({
        next: () => {
          alert('Visage encodé et ajouté à la base de données IA !');
          this.router.navigate(['/admin/visages']);
        },
        error: (err) => alert('Erreur : ' + err.message)
      });
    }
  }
}