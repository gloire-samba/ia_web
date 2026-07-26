import os
import zipfile
import fitz  # PyMuPDF
from smolagents import tool

@tool
def outil_fusionner_pdf(chemin_fichier1: str, chemin_fichier2: str = "") -> str:
    """
    Fusionne deux fichiers PDF en un seul.
    Si l'utilisateur envoie des fichiers Word ou PPT, convertis-les d'abord en PDF.
    
    Args:
        chemin_fichier1: Le chemin absolu du premier fichier PDF.
        chemin_fichier2: Le chemin absolu du deuxième fichier PDF.
    """
    if not chemin_fichier1 or not chemin_fichier2:
        return "INSTRUCTION AGENT : Explique poliment à l'utilisateur qu'il a oublié un fichier et qu'il faut fournir obligatoirement 2 fichiers pour effectuer une fusion."
        
    ext1 = os.path.splitext(chemin_fichier1)[1].lower()
    ext2 = os.path.splitext(chemin_fichier2)[1].lower()
    
    if ext1 != '.pdf' or ext2 != '.pdf':
        return "INSTRUCTION AGENT : Explique poliment que les fichiers doivent être du même type, et que la fusion directe est réservée aux PDF. Propose-lui de les convertir d'abord en PDF."

    if not os.path.exists(chemin_fichier1) or not os.path.exists(chemin_fichier2):
        return "INSTRUCTION AGENT : Explique poliment qu'un des fichiers n'a pas pu être lu par le système."

    try:
        doc1 = fitz.open(chemin_fichier1)
        doc2 = fitz.open(chemin_fichier2)
        
        doc1.insert_pdf(doc2)
        
        dossier = os.path.dirname(chemin_fichier1)
        chemin_sortie = os.path.join(dossier, "fusion_resultat_ia.pdf")
        doc1.save(chemin_sortie)
        
        doc1.close()
        doc2.close()
        return f"Fusion réussie. Le fichier fusionné est disponible ici : {chemin_sortie}"
    except Exception as e:
        return f"Erreur système lors de la fusion : {str(e)}"

@tool
def outil_separer_pdf(chemin_pdf: str, pages_de_coupe: str = "", nombre_parties: int = 0) -> str:
    """
    Sépare un fichier PDF en plusieurs parties compressées dans un fichier ZIP.
    
    Args:
        chemin_pdf: Le chemin absolu du fichier PDF à séparer.
        pages_de_coupe: Les numéros des pages où couper (ex: "3, 5" pour couper après la page 3 et après la page 5).
        nombre_parties: Le nombre total de fichiers attendus.
    """
    if not pages_de_coupe or not nombre_parties or nombre_parties <= 1:
        return "INSTRUCTION AGENT : Explique poliment à l'utilisateur qu'il manque des instructions claires. Il doit préciser les numéros des pages où couper ET le nombre total de parties attendues (ex: 'Coupe aux pages 2 et 4 pour faire 3 fichiers')."

    ext = os.path.splitext(chemin_pdf)[1].lower()
    if ext != '.pdf':
        return "INSTRUCTION AGENT : Explique poliment que la séparation par page ne fonctionne que sur les PDF pour préserver la mise en page. S'il s'agit d'un Word ou PowerPoint, convertis-le en PDF d'abord."

    try:
        doc = fitz.open(chemin_pdf)
        total_pages = len(doc)
        
        # Nettoyage et tri des points de coupe
        coupes_str = pages_de_coupe.replace(" ", "").split(",")
        coupes = [int(c) for c in coupes_str if c.isdigit()]
        coupes.sort()

        if len(coupes) + 1 != nombre_parties:
            return f"INSTRUCTION AGENT : Explique poliment que le nombre de coupes demandées ({len(coupes)}) ne permet pas de créer le nombre de parties attendues ({nombre_parties})."

        dossier = os.path.dirname(chemin_pdf)
        base_name = os.path.splitext(os.path.basename(chemin_pdf))[0]
        fichiers_generes = []
        
        start_page = 0
        partie_actuelle = 1
        
        # Séparation aux points de coupe
        for coupe in coupes:
            end_page = coupe - 1 # PyMuPDF commence à l'index 0
            if end_page >= total_pages or start_page > end_page:
                return f"INSTRUCTION AGENT : Explique poliment que la page de coupe {coupe} est impossible car le document ne fait que {total_pages} pages."
                
            nouveau_doc = fitz.open()
            nouveau_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
            nom_partie = os.path.join(dossier, f"{base_name}_part{partie_actuelle}.pdf")
            nouveau_doc.save(nom_partie)
            nouveau_doc.close()
            fichiers_generes.append(nom_partie)
            
            start_page = end_page + 1
            partie_actuelle += 1
            
        # Création de la dernière partie jusqu'à la fin du document
        if start_page < total_pages:
            nouveau_doc = fitz.open()
            nouveau_doc.insert_pdf(doc, from_page=start_page, to_page=total_pages - 1)
            nom_partie = os.path.join(dossier, f"{base_name}_part{partie_actuelle}.pdf")
            nouveau_doc.save(nom_partie)
            nouveau_doc.close()
            fichiers_generes.append(nom_partie)

        doc.close()
        
        # Emballage dans un ZIP (Pour que le backend puisse télécharger une seule pièce jointe)
        chemin_zip = os.path.join(dossier, f"{base_name}_separe.zip")
        with zipfile.ZipFile(chemin_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for f in fichiers_generes:
                zipf.write(f, arcname=os.path.basename(f))
                
        # Nettoyage des PDF temporaires pour garder le disque propre
        for f in fichiers_generes:
            os.remove(f)
            
        return f"Séparation réussie. Toutes les parties ont été rassemblées dans l'archive : {chemin_zip}"
        
    except Exception as e:
        return f"Erreur technique lors de la séparation : {str(e)}"