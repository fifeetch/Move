# Cap Montagne

Une application web légère pour organiser la vente de la maison, le tri, le déménagement et le budget de Marion et Philippe.

## Lancer l’application

L’application ne nécessite aucune installation. Ouvrez simplement `index.html` dans un navigateur.

Pour un serveur local :

```powershell
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000`.

Les données sont synchronisées avec Firebase Authentication et Cloud Firestore. Les comptes sont créés par l’administrateur dans Firebase ; l’application propose uniquement la connexion. Lors de sa première connexion, un nouveau membre rattache une seule fois son compte au foyer grâce au code partagé.

## Publier sur GitHub Pages

1. Créer un dépôt GitHub et y envoyer les fichiers.
2. Ouvrir **Settings → Pages**.
3. Choisir **Deploy from a branch**, puis la branche `main` et le dossier `/root`.

## Configuration Firebase

Le projet utilise :

- **Firebase Authentication** avec adresse e-mail et mot de passe ;
- **Cloud Firestore** pour synchroniser les tâches et les dépenses ;
- une séparation des données par foyer ;
- des règles Firestore limitant l’accès aux membres du foyer.

Les règles sont conservées dans `firestore.rules` et peuvent être déployées avec :

```powershell
firebase deploy --only firestore:rules --project cap-montagne
```
