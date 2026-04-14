# Chronicles-Tauri - Plan d'Amelioration Detaille

## Sommaire du Projet

**Chronicles** est une application desktop Tauri v2 (React 19 + TypeScript + Ant Design) servant d'outil companion pour l'addon World of Warcraft "Chronicles". Elle permet de gerer une base de donnees JSON locale d'evenements, personnages, factions et collections de l'univers Warcraft, puis d'exporter ces donnees sous forme de fichiers Lua/XML pour l'addon WoW.

---

## 1. Architecture & Performance de la Base de Donnees

### 1.1 Probleme N+1 : Lecture/Ecriture complete a chaque operation

**Constat :** `database.ts` charge et parse le fichier JSON complet pour chaque operation CRUD, puis re-ecrit le fichier entier lors des mutations. La logique utilise un cache memoire et un flag dirty, mais le code a encore des points de fragilite sur les cycles de vie, le flush et les conditions de course.

**Ameliorations proposees :**
- [x] Charger la base une seule fois en memoire dans des structures `Tables` et `Map<number, DbObject>`
- [x] Ecrire sur disque seulement apres mutation avec un `dirty` flag et un debouncing clair
- [x] Conserver un index par ID pour des lookups O(1) et eviter les `filter()` redondants
- [ ] Prevoir un flush explicite et/ou un mode de sauvegarde synchrone pour les cas critiques
- [ ] Ajouter une validation de schema / format JSON avant `JSON.parse` pour détecter les fichiers corrompus

### 1.2 Validation runtime du `dbName` dynamique

**Constat :** `dbName` sert d'identifiant dynamique de regroupement et ne correspond pas à une liste de tables fixe connue à la compilation. C'est acceptable, mais le traitement doit valider les noms au runtime et ne pas laisser passer des identifiants invalides sans erreur.

**Ameliorations proposees :**
- [ ] Garder l'API générique `getAll<T>(dbName: string)` / `get<T>(id, dbName)` tout en ajoutant une validation centralisée du `dbName`
- [ ] Maintenir une source de vérité runtime pour les tables connues dans le schema (`Set<string>` ou `validTableNames`)
- [ ] Lever des erreurs explicites si `dbName` n'appartient pas au schema ou si la table n'existe pas
- [ ] Documenter que `dbName` est un identifiant dynamique de regroupement, pas une union TypeScript fixe

### 1.3 Probleme N+1 dans les Mappers

**Constat :** Dans `dbprovider.tsx`, les mappers (`EventMapper.mapFromDb`, `CharacterMapper.mapFromDb`, etc.) appellent `database.getAll()` et `database.get()` de manière répétée. Cela crée des recompositions d'objets et des recherches de table multiples pour une même opération, malgré le cache de session.

**Ameliorations proposees :**
- [ ] Charger toutes les tables nécessaires une seule fois avant le mapping et résoudre les references en mémoire
- [ ] Faire évoluer le cache de session pour éviter les lectures redondantes dans un même cycle de rendu
- [ ] Séparer la logique de mapping de la couche React / Context et envisager une couche dédiée `Repository` ou `DataLoader`
- [ ] Si le budget le permet, déplacer une partie de la transformation vers Rust via des commandes Tauri pour réduire la charge JS

### 1.4 Correctifs critiques dans `initdb()`

**Constat :** la création de la base a deux problèmes dans `database.ts` : `exists(dbdirectory)` est utilisé sans `await` et `writeTextFile()` est invoqué sans `await`, ce qui peut provoquer des promesses non résolues et des conditions de course.

**Ameliorations proposees :**
- [x] Corriger l'appel `await exists(dbdirectory)` et garantir que le chemin est bien normalisé avant de l'utiliser
- [x] Ajouter `await writeTextFile(this.dbpath, jsondb)` dans `initdb()`
- [ ] Ajouter des tests unitaires pour la création de la base, la gestion du chemin et le comportement de reprise en cas de fichier manquant

---

## 2. Qualite du Code & Maintenabilite

### 2.1 Nettoyage des dependances inutilisees

**Constat :**
- `archiver` (npm) est installe mais jamais importe (seul `jszip` est utilise)
- `ant-design` ^1.0.0 semble etre un doublon inutile de `antd`
- `@types/archiver` est present en devDependencies pour un package inutilise
- La commande Rust `greet` est un vestige du template Tauri initial

**Ameliorations :**
- [x] Supprimer `archiver`, `@types/archiver`, et `ant-design` du `package.json`
- [x] Supprimer la commande `greet` dans `src-tauri/src/lib.rs`
- [ ] Supprimer `@tauri-apps/plugin-opener` si elle n'est pas effectivement utilisee dans le code

### 2.2 Typage TypeScript a renforcer

**Constat :**
- Utilisation de `any` dans plusieurs endroits critiques : `generator.ts` (lignes 46-49), `handleModalOk` (`values: any`), `FileGenerationRequest` casting
- Classes CSS `bp5-minimal` (BlueprintJS) presentes dans les composants alors que le projet utilise Ant Design

**Ameliorations :**
- [ ] Remplacer tous les `any` par des types stricts, notamment dans `AddonGenerator.Create()` et les handlers de modals
- [ ] Definir une interface typee pour les valeurs de formulaire de chaque modal
- [ ] Supprimer les classes CSS `bp5-minimal` qui sont des vestiges d'un ancien framework UI

### 2.3 Cohérence de nommage

**Constat :**
- Mix camelCase/PascalCase pour les noms de fichiers : `eventList.tsx` vs `EventList.tsx`, `characterList.tsx` vs `CharacterModal.tsx`
- `FormatedCollection` contient une faute de frappe ("Formated" -> "Formatted")
- `dbcontext.ts` vs `dbprovider.tsx` vs `Loader.tsx` : pas de convention uniforme

**Ameliorations :**
- [ ] Adopter une convention PascalCase pour tous les composants React (fichiers et exports)
- [ ] Corriger les fautes de frappe dans les noms d'interfaces
- [ ] Homogeneiser les noms de fichiers dans tout le projet

### 2.4 Configuration outillage manquante

**Constat :** Aucun linter (ESLint) ni formatter (Prettier) n'est configure.

**Ameliorations :**
- [ ] Ajouter une configuration **ESLint** avec le plugin React + TypeScript
- [ ] Ajouter une configuration **Prettier** pour le formatage automatique
- [ ] Ajouter des scripts `lint` et `format` dans `package.json`
- [ ] Envisager un hook pre-commit via **Husky** + **lint-staged**

---

## 3. Experience Utilisateur (UX)

### 3.1 Fenetre non-redimensionnable

**Constat :** La fenetre est fixee a 1600x880px et n'est pas redimensionnable (`resizable: false` dans `tauri.conf.json`). Les variables SCSS sont codees en dur pour cette taille.

**Ameliorations :**
- [ ] Activer le redimensionnement de la fenetre
- [ ] Migrer les tailles fixes SCSS vers des unites relatives (`%`, `vh`, `vw`, `rem`)
- [ ] Implementer un layout responsive avec des breakpoints
- [ ] Tester sur differentes resolutions d'ecran

### 3.2 Pas de confirmation avant suppression

**Constat :** Les boutons de suppression (evenements, personnages, factions) executent la suppression immediatement sans demander confirmation, sauf pour les locales qui verifient les references.

**Ameliorations :**
- [ ] Ajouter un **modal de confirmation** (`Modal.confirm`) avant toute suppression
- [ ] Verifier les dependances (ex: supprimer un personnage reference par des evenements) et **avertir l'utilisateur** des impacts en cascade
- [ ] Implementer une option **d'annulation** (undo) pour les operations destructives

### 3.3 Gestion des erreurs insuffisante

**Constat :** Les erreurs sont loguees dans la console mais non affichees a l'utilisateur. Les echecs d'E/S fichier, de parsing JSON, ou de mapping sont silencieux.

**Ameliorations :**
- [ ] Implementer un systeme de **notifications** (Ant Design `message` ou `notification`) pour afficher les succes et les erreurs
- [ ] Ajouter un **ErrorBoundary** global avec un rendu fallback informatif (un `ErrorBoundary` existe mais n'est pas utilise partout)
- [ ] Afficher un message clair quand le chargement de la base echoue

### 3.4 Page Settings non implementee

**Constat :** `settingsView.tsx` est un placeholder vide.

**Ameliorations :**
- [ ] Implementer les reglages : chemin de la base par defaut, theme clair/sombre, langue de l'interface, prefixes d'export
- [ ] Ou supprimer la page et l'entree de menu si elle n'est pas prevue a court terme

### 3.5 Pas de recherche/filtrage avance

**Constat :** Le seul filtre disponible est par Collection. Il n'y a pas de barre de recherche, de tri par colonnes, ni de filtres par timeline/type d'evenement.

**Ameliorations :**
- [ ] Ajouter une **barre de recherche** globale (par nom)
- [ ] Ajouter des **filtres par colonnes** natifs aux `Table` Ant Design (timeline, eventType, factions)
- [ ] Implementer un **tri cliquable** sur les en-tetes de colonnes
- [ ] Ajouter la **pagination** pour les grandes bases de donnees

---

## 4. Backend Rust (Tauri)

### 4.1 Le backend Rust est sous-utilise

**Constat :** Tout le traitement de donnees est fait cote JavaScript. Le backend Rust ne contient qu'une commande `greet` inutilisee. Cela represente une opportunite manquee en termes de performance et de securite.

**Ameliorations :**
- [ ] Migrer la couche base de donnees cote **Rust** : lecture/ecriture JSON, indexation, requetes
- [ ] Exposer des **commandes Tauri typees** pour le CRUD (`get_events`, `add_event`, `update_event`, etc.)
- [ ] Implementer la **validation des donnees** cote Rust (schemas, contraintes d'integrite referentielle)
- [ ] Generer les fichiers **Lua/XML** cote Rust pour de meilleures performances lors de l'export

### 4.2 Permissions FS trop larges

**Constat :** `capabilities/default.json` accorde `fs:read-all` et `fs:write-all` sur `**` (tous les chemins).

**Ameliorations :**
- [ ] Restreindre les permissions FS au **scope minimal** : repertoire de la base de donnees et repertoire d'export uniquement
- [ ] Utiliser les **scopes dynamiques** de Tauri v2 pour ajouter les chemins choisis par l'utilisateur

---

## 5. Tests & Qualite

### 5.1 Aucune suite de tests

**Constat :** Le projet ne contient aucun test unitaire, d'integration, ou end-to-end.

**Ameliorations :**
- [ ] Ajouter **Vitest** comme framework de tests unitaires (natif Vite)
- [ ] Ecrire des tests pour :
  - La classe `Database` (CRUD, IDs auto-increment, gestion des erreurs)
  - Les **mappers** (conversion DB <-> App objects)
  - Le `LocaleUtils` (creation/mise a jour de locales)
  - Le `DBService` et `LocaleService` (generation des fichiers Lua/XML)
  - Le `AddonGenerator` (orchestration de l'export)
- [ ] Ajouter des tests **composants** avec React Testing Library pour les formulaires et les listes
- [ ] Envisager des tests **Rust** pour les futures commandes backend
- [ ] Viser une **couverture de code** minimale de 70%

### 5.2 Pas de CI/CD

**Constat :** Aucun pipeline d'integration continue.

**Ameliorations :**
- [ ] Creer un workflow **GitHub Actions** avec :
  - Verification TypeScript (`tsc --noEmit`)
  - Lint ESLint
  - Execution des tests Vitest
  - Build Tauri (multi-plateforme si necessaire)
- [ ] Ajouter des **badges** de statut dans le README
- [ ] Configurer des releases automatiques avec versionning semantique

---

## 6. Fonctionnalites Manquantes

### 6.1 Import/Export de la base

**Ameliorations :**
- [ ] Ajouter un bouton **"Sauvegarder sous"** pour dupliquer la base JSON
- [ ] Implementer un **import/merge** de bases de donnees (fusionner deux fichiers JSON)
- [ ] Ajouter un export au format **CSV** ou **Excel** pour la consultation externe
- [ ] Implementer un **historique de modifications** (versioning simple de la base)

### 6.2 Gestion des relations et integrite referentielle

**Constat :** Il n'y a pas de verification d'integrite lors des suppressions. Supprimer une faction referencee par des evenements laisse des IDs orphelins.

**Ameliorations :**
- [ ] Implementer un **controle d'integrite referentielle** avant suppression
- [ ] Proposer une **suppression en cascade** ou un **nettoyage des references** quand une entite est supprimee
- [ ] Ajouter un outil de **diagnostic** qui detecte et repare les references cassees dans la base

### 6.3 Statistiques et Dashboard

**Ameliorations :**
- [ ] Ajouter un **tableau de bord** affichant des statistiques : nombre d'evenements par collection, completude des traductions, chronologie visuelle
- [ ] Implementer une **vue timeline** interactive des evenements
- [ ] Afficher la **couverture des traductions** (pourcentage de locales remplies par langue)

### 6.4 Support multi-fichiers et recents

**Ameliorations :**
- [ ] Stockzer la liste des **bases recemment ouvertes** (via `localStorage` ou un fichier de config Tauri)
- [ ] Afficher un ecran d'accueil avec les fichiers recents et un bouton "Nouveau"

---

## 7. Documentation

### 7.1 Documentation insuffisante

**Constat :** Le README.md est minimal (genere par le template Tauri).

**Ameliorations :**
- [ ] Reecrire le **README** avec : description du projet, captures d'ecran, guide d'installation, guide de contribution
- [ ] Ajouter une documentation **architecture** (diagramme de composants, flux de donnees)
- [ ] Documenter le **format de la base de donnees JSON** (schema, relations entre tables)
- [ ] Documenter le **format des fichiers Lua/XML** generes pour l'addon WoW
- [ ] Ajouter un **CHANGELOG** pour suivre les versions

---

## 8. Securite

### 8.1 Scopes et CSP

**Constat :** CSP (`Content-Security-Policy`) n'est pas configure dans `tauri.conf.json` au-dela du defaut.

**Ameliorations :**
- [ ] Configurer une **CSP stricte** adaptee au projet
- [ ] Auditer les permissions Tauri et les reduire au **principe du moindre privilege**
- [ ] Valider/sanitizer les entrees utilisateur avant insertion en base (protection contre l'injection dans les fichiers Lua generes)

---

## 9. Priorites Recommandees

| Priorite | Amelioration | Impact | Effort |
|----------|-------------|--------|--------|
| **P0** | Corriger les bugs (`await` manquants dans `database.ts`) | Critique | Faible |
| **P0** | Supprimer les dependances inutilisees | Hygiene | Faible |
| **P1** | Cache memoire pour la base de donnees | Performance | Moyen |
| **P1** | Confirmation avant suppression | UX/Securite | Faible |
| **P1** | Notifications d'erreurs utilisateur | UX | Faible |
| **P1** | ESLint + Prettier | Qualite | Faible |
| **P2** | Tests unitaires (Vitest) | Fiabilite | Moyen |
| **P2** | CI/CD GitHub Actions | Automatisation | Moyen |
| **P2** | Typage strict (elimination des `any`) | Maintenabilite | Moyen |
| **P2** | Controle d'integrite referentielle | Fiabilite | Moyen |
| **P3** | Migration DB vers Rust | Performance | Eleve |
| **P3** | Fenetre responsive | UX | Moyen |
| **P3** | Recherche et filtrage avance | UX | Moyen |
| **P3** | Dashboard statistiques | Fonctionnalite | Moyen |
| **P4** | Import/merge de bases | Fonctionnalite | Eleve |
| **P4** | Documentation complete | Documentation | Moyen |
| **P4** | Vue timeline interactive | Fonctionnalite | Eleve |

---

*Document genere le 2026-04-13 - Basee sur l'analyse de la branche `feat/edition`*
