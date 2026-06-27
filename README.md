# Cap Montagne

Une application web légère pour organiser la vente de la maison, le tri, le déménagement et le budget de Marion et Philippe.

## Lancer l’application

L’application ne nécessite aucune installation. Ouvrez simplement `index.html` dans un navigateur.

Pour un serveur local :

```powershell
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000`.

Les données sont actuellement conservées dans le `localStorage` du navigateur. Elles restent donc sur l’appareil utilisé.

## Publier sur GitHub Pages

1. Créer un dépôt GitHub et y envoyer les fichiers.
2. Ouvrir **Settings → Pages**.
3. Choisir **Deploy from a branch**, puis la branche `main` et le dossier `/root`.

## Étape suivante : Firebase

La structure est prête à évoluer vers Firebase :

- **Firebase Authentication** pour créer les comptes de Marion et Philippe ;
- **Cloud Firestore** pour synchroniser tâches, dépenses, contacts et documents ;
- un champ `householdId` sur chaque donnée pour isoler chaque foyer ;
- des règles Firestore limitant l’accès aux membres du foyer ;
- **Firebase Hosting** pour publier l’application.

Avant cette migration, les appels `localStorage` de `app.js` seront remplacés par des lectures et écritures Firestore. Il faudra également ajouter un écran de connexion et un fichier de configuration Firebase.
