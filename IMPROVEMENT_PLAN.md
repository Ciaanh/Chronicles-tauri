# Chronicles-Tauri — Plan d'Amelioration v2

> Remplace le plan v1 du 2026-04-14. Base sur les resultats d'une revue complete
> (architecture, UX/UI, audit de packages) confrontee a l'avancement reel du projet.

## Sommaire du Projet

**Chronicles** est une application desktop Tauri v2 (React 19 + TypeScript + Ant Design 5) servant d'outil companion pour l'addon World of Warcraft "Chronicles". Elle permet de gerer une base de donnees JSON locale d'evenements, personnages, factions et collections de l'univers Warcraft, puis d'exporter ces donnees sous forme de fichiers Lua/XML pour l'addon WoW.

---

## 0. Bilan du Plan v1

Le plan v1 couvrait 9 sections. Apres implementation sur la branche `feat/edition`, le resultat est :

| Section | Progression | Note |
|---------|-------------|------|
| 1. Architecture, stockage & validation | **100 %** | Mappers, validation, escaping, .bak, CSP |
| 2. Qualite du code | **100 %** | Deps cleanup, typing, nommage, linting |
| 3. Experience utilisateur | **100 %** | Fenetre, confirmations, erreurs, recherche |
| 4. Backend Rust | **Non demarre** | Reporte volontairement (reecriture majeure) |
| 5. Tests & CI | **85 %** | Vitest, CI, release workflow — tests Rust non faits |
| 6. Fonctionnalites | **85 %** | Import/merge non fait |
| 7. Documentation | **100 %** | README, schema, changelog |
| 8. Securite | **100 %** | CSP, permissions, sanitation |

**Items restes ouverts et repris dans ce plan :**
- Import / merge de bases de donnees
- Migration partielle vers Rust
- Tests Rust

La revue approfondie (architecture + UX/UI du 2026-04-15) a revele de **nouveaux problemes** non couverts par le plan v1. Ce plan v2 les adresse.

---

## 1. Securite — Permissions FS trop larges *(P0)*

**Constat :** `capabilities/default.json` accorde `$HOME/**` en lecture, ecriture et existence sur les quatre identifiants FS. Cela expose l'ensemble du profil utilisateur alors que l'application n'a besoin d'acceder qu'aux fichiers selectionnes par l'utilisateur via le dialogue natif.

**Actions requises :**
- [ ] Retirer `{ "path": "$HOME/**" }` de chaque permission dans `capabilities/default.json`.
- [ ] Conserver uniquement `$DOCUMENT/**`, `$DOWNLOAD/**`, `$DESKTOP/**` comme scopes statiques.
- [ ] Verifier que le dialogue natif (`plugin-dialog`) fournit deja un scope dynamique pour les fichiers choisis.
- [ ] Tester que l'ouverture, la sauvegarde et l'export fonctionnent toujours correctement apres restriction.

---

## 2. Architecture — Duplication des composants List *(P1)*

**Constat :** `EventList.tsx` (345 lignes), `CharacterList.tsx` (329 lignes) et `FactionList.tsx` (343 lignes) partagent ~80 % de logique identique : fetch, filtrage collection, recherche, undo-delete, modal open/close, colonnes d'actions, pagination. Seuls les colonnes de donnees et les types different. Cela triple le cout de chaque amelioration (tri, debounce, bulk ops, etc.).

**Actions requises :**
- [ ] Creer un composant generique `GenericEntityList<T>` dans `src/components/_shared/` encapsulant : fetch + filtre collection, recherche, undo-delete, pagination, boutons d'actions.
- [ ] Definir une interface `EntityListConfig<T>` (colonne definition, fetch fn, mapper fn, modal component, entity label).
- [ ] Refactoriser `EventList`, `CharacterList` et `FactionList` pour n'etre que des configurations du composant generique.
- [ ] Deplacer la logique metier (fetch, delete with undo, cascade check) dans un hook partage `useEntityCrud<T>`.

---

## 3. Architecture — Robustesse du data layer *(P1)*

### 3.1 Ecritures non atomiques

**Constat :** Les operations liees (ex: creation d'un Event + creation de ses Locales) sont deux appels `dbContext.add()` sequentiels. Si le second echoue, la base reste en etat inconsistant.

**Actions requises :**
- [ ] Ajouter une methode `dbContext.transaction(async (tx) => { ... })` qui bufferise les ecritures et les applique en une seule passe, ou rollback sur erreur.
- [ ] Utiliser cette transaction dans les operations multi-entites (`addEvent`, `updateEvent`, `deleteEvent` avec cascade).

### 3.2 Cache mapper — risque de race condition

**Constat :** `ensureMapperCache()` est async. Si deux operations CRUD sont declenchees en parallele, elles peuvent invalider et repeupler le cache de maniere concurrente, produisant des donnees perimees.

**Actions requises :**
- [ ] Ajouter un mecanisme de lock ou de deduplication sur `ensureMapperCache()` (ex: un `Promise` unique reutilise si un refresh est deja en cours).
- [ ] Invalider le cache de maniere granulaire (par table affectee) plutot que globalement a chaque CRUD.

### 3.3 Stabilite de `neutron-db`

**Constat :** `neutron-db ^0.1.0` est une dependance 0.x avec un risque de breaking change. Pas de fallback en cas d'abandon du projet.

**Actions requises :**
- [ ] Evaluer si `neutron-db` apporte un avantage par rapport a un read/write JSON direct avec `@tauri-apps/plugin-fs`.
- [ ] Si non, remplacer par un wrapper interne minimal et retirer la dependance.
- [ ] Si oui, epingler une version exacte et documenter le risque.

---

## 4. Architecture — Validation Lua post-generation *(P2)*

**Constat :** Les fichiers Lua generes par `dbService.ts` et `localeService.ts` ne sont jamais valides syntaxiquement avant mise en ZIP. Un bug d'escaping ou de concatenation peut produire un addon non fonctionnel sans que l'utilisateur le sache.

**Actions requises :**
- [ ] Ajouter une verification de coherence basique post-generation : accolades equilibrees, guillemets fermes, pas de `nil` inattendu.
- [ ] Afficher un avertissement utilisateur si la verification echoue, avant le telechargement du ZIP.

---

## 5. Qualite du Code *(P1)*

### 5.1 ESLint — `no-explicit-any` en erreur

**Constat :** La regle `@typescript-eslint/no-explicit-any` est en `warn`. Du `any` peut donc passer en CI sans bloquer.

**Actions requises :**
- [ ] Passer la regle a `error` dans `eslint.config.js`.
- [ ] Corriger les eventuels nouveaux echecs de lint.

### 5.2 Couverture de tests insuffisante

**Constat :** 3 fichiers de test (29 tests). Les mappers (400+ LOC), les services d'addon generation, et tous les composants List/Modal sont non testes.

**Actions requises :**
- [ ] Ajouter des tests unitaires pour `src/database/mappers/index.ts` : mapping Event, Character, Faction avec references croisees, cas d'erreur (entite manquante).
- [ ] Ajouter des tests unitaires pour `src/app/addon/services/dbService.ts` et `localeService.ts` : generation correcte, escaping, cas limites.
- [ ] Ajouter des tests de composants pour au moins un List et un Modal (EventList + EventModal) : render, search, delete+undo.
- [ ] Objectif : couverture > 60 % des lignes.

### 5.3 `test-setup.ts` vide

**Constat :** Le fichier de setup Vitest existe mais ne contient rien d'utile.

**Actions requises :**
- [ ] Configurer le nettoyage des mocks entre tests (`vi.clearAllMocks()` dans `beforeEach`).
- [ ] Ajouter les matchers `@testing-library/jest-dom` dans le setup.

---

## 6. UX — Navigation et Settings *(P1)*

### 6.1 Page Settings vide

**Constat :** Le menu header affiche "Settings" mais la page ne contient qu'un titre et un placeholder. C'est une impasse de navigation.

**Actions requises :**
- [ ] Option A : Peupler la page Settings avec des preferences reelles (theme clair/sombre, langue de l'interface, chemin d'export par defaut, taille de page des tableaux).
- [ ] Option B : Retirer "Settings" du menu header jusqu'a ce que du contenu existe.
- [ ] Documenter le choix retenu.

### 6.2 Filtres de collection non appliques globalement

**Constat :** Le selecteur de collection dans le header filtre les onglets Events, Characters, Factions et Collections. Mais les onglets Stats, Timeline, History et Export l'ignorent.

**Actions requises :**
- [ ] Appliquer le filtre de collection actif aux onglets Timeline et Stats.
- [ ] Adapter Export pour qu'il exporte uniquement la collection selectionnee si un filtre est actif (avec option "tout exporter").

---

## 7. UX — Tables et Interactions *(P2)*

### 7.1 Tri sur colonnes

**Constat :** Aucune table ne permet le tri par clic sur l'en-tete de colonne. Les donnees apparaissent dans l'ordre de chargement.

**Actions requises :**
- [ ] Ajouter `sorter` sur les colonnes Name/Period de chaque table Ant Design.
- [ ] Definir un tri par defaut par nom alphabetique.

### 7.2 Debounce de recherche

**Constat :** Le champ de recherche filtre a chaque frappe. Sur de gros jeux de donnees, cela cause des re-renders inutiles.

**Actions requises :**
- [ ] Ajouter un debounce de 300 ms sur le `onChange` du champ de recherche dans chaque List.
- [ ] Si le composant generique (section 2) est en place, l'implementer une seule fois.

### 7.3 Pre-selection de la collection dans les modals

**Constat :** Quand un filtre de collection est actif dans le header, le modal de creation d'un nouvel evenement ne pre-renseigne pas la collection. L'utilisateur doit la re-selectionner manuellement.

**Actions requises :**
- [ ] Passer `filters.collection` comme valeur initiale du champ collection dans EventModal.

### 7.4 Skeleton de chargement

**Constat :** Le passage d'un onglet a l'autre n'affiche aucun indicateur pendant le fetch. L'utilisateur voit un tableau vide temporairement.

**Actions requises :**
- [ ] Ajouter un `<Skeleton active paragraph={{ rows: 5 }} />` pendant le chargement des donnees dans chaque List.

### 7.5 Timeline cliquable

**Constat :** L'onglet Timeline affiche les evenements en chronologie mais ils ne sont pas cliquables. L'utilisateur ne peut pas naviguer vers l'edition d'un evenement depuis la timeline.

**Actions requises :**
- [ ] Rendre les items de la Timeline cliquables pour ouvrir l'EventModal en mode edition.

---

## 8. UX — Theming et Design System *(P3)*

### 8.1 Mode sombre

**Constat :** `Providers.tsx` contient `theme.darkAlgorithm` en commentaire. Aucune implementation n'est en place.

**Actions requises :**
- [ ] Ajouter un toggle Dark/Light dans les Settings (ou dans le header).
- [ ] Activer `darkAlgorithm` conditionellement dans le `ConfigProvider` Ant Design.
- [ ] Persister la preference utilisateur dans `localStorage`.
- [ ] Verifier le contraste des composants custom (SCSS) en mode sombre.

### 8.2 Design tokens

**Constat :** `variables.scss` ne contient que des dimensions viewport. Pas de palette de couleurs, d'echelle de spacing ou de hierarchie typographique. Les marges/paddings sont des valeurs magiques (12, 16, 24, 32 px) sans coherence.

**Actions requises :**
- [ ] Definir un fichier `tokens.scss` avec : palette couleur (primaire, succes, warning, danger), echelle de spacing (`$space-xs` a `$space-xl`), echelle typographique.
- [ ] Remplacer les valeurs magiques par les tokens dans tous les fichiers SCSS.
- [ ] Remplacer `calc(100vh - 250px)` par des CSS custom properties ou un calcul dynamique.

### 8.3 Accessibilite

**Constat :** Pas de labels ARIA, pas de gestion du focus dans les modals, pas de raccourcis clavier, boutons icon-only sans texte alternatif.

**Actions requises :**
- [ ] Ajouter `aria-label` sur les boutons icon-only (Edit, Delete, Add).
- [ ] Ajouter `title` tooltip sur les boutons d'action.
- [ ] Gerer le focus automatique sur le premier champ a l'ouverture d'un modal.
- [ ] Ajouter un raccourci Ctrl+Enter pour soumettre les formulaires modaux.

---

## 9. Mises a jour des dependances *(P1/P3)*

### 9.1 Mises a jour mineures — Sans risque *(P1)*

Toutes les mises a jour mineures ci-dessous sont retro-compatibles. A appliquer en une seule passe.

| Package | Actuel | Cible |
|---------|--------|-------|
| `prettier` | ^3.8.2 | ^3.8.3 |
| `@tauri-apps/api` | ^2.5.0 | ^2.10.1 |
| `@tauri-apps/cli` | ^2.5.0 | ^2.10.1 |
| `@tauri-apps/plugin-dialog` | ^2.2.0 | ^2.7.0 |
| `@tauri-apps/plugin-fs` | ^2.2.0 | ^2.5.0 |
| `@types/react` | ^19.1.4 | ^19.2.14 |
| `@types/react-dom` | ^19.1.5 | ^19.2.3 |
| `react` | ^19.0.0 | ^19.2.5 |
| `react-dom` | ^19.0.0 | ^19.2.5 |
| `react-router-dom` | ^7.3.0 | ^7.14.1 |
| `sass-embedded` | ^1.89.0 | ^1.99.0 |

**Actions requises :**
- [ ] Executer `npx npm-check-updates --target minor -u && npm install`.
- [ ] Verifier que `npm run build` et `npm run test` passent sans erreur.
- [ ] Tester manuellement un cycle complet (ouvrir base, editer, exporter).

### 9.2 Mises a jour majeures — Investigation requise *(P3)*

Ces packages ont des nouvelles versions majeures. Chacune necessite une branche d'investigation separee.

| Package | Actuel | Cible | Risque |
|---------|--------|-------|--------|
| `antd` | ^5.25.2 | ^6.3.5 | **Eleve** — nouveau moteur CSS-in-JS, changements d'API de composants, props deprecees retirees |
| `vite` | ^6.3.5 | ^8.0.8 | **Moyen** — deux sauts majeurs (6→7→8), changements de config, compatibilite plugins |
| `@vitejs/plugin-react` | ^4.4.1 | ^6.0.1 | **Moyen** — doit correspondre a la version majeure de Vite |
| `typescript` | ~5.8.3 | ~6.0.2 | **Moyen** — changements semantiques decorateurs, `isolatedDeclarations` |

**Actions requises :**
- [ ] **antd 6** : Creer une branche `spike/antd-6`, installer antd 6, evaluer les breaking changes (lire le guide de migration), lister les composants impactes, estimer l'effort.
- [ ] **Vite 8 + plugin-react 6** : Creer une branche `spike/vite-8`, mettre a jour vite + plugin, verifier la config `vite.config.ts`, tester build + dev server.
- [ ] **TypeScript 6** : Creer une branche `spike/ts-6`, mettre a jour, executer `tsc --noEmit`, corriger les erreurs.
- [ ] Ne merger qu'apres validation CI complete sur chaque branche d'investigation.

---

## 10. Fonctionnalites — Import / Merge *(P2)*

**Constat :** L'export (JSON, CSV, Lua/XML) est en place. L'import/merge de bases de donnees n'est pas implemente.

**Actions requises :**
- [ ] Concevoir la strategie de merge : resolution des conflits d'IDs, deduplication par nom, gestion des locales.
- [ ] Ajouter un bouton "Importer" dans l'onglet Export (ou un onglet dedie).
- [ ] Permettre l'import d'un fichier JSON au format Chronicles, avec affichage d'un recapitulatif avant application.
- [ ] Gerer les collisions d'IDs via re-numerotion automatique.

---

## 11. Backend Rust *(P4 — direction future)*

**Constat :** Aucune commande Rust personnalisee dans `lib.rs`. Tout le CRUD et la generation restent en TypeScript. Migrer vers Rust serait une reecriture majeure.

**Actions requises (phase future uniquement) :**
- [ ] Evaluer une migration partielle de la persistance JSON vers Rust.
- [ ] Exposer des commandes Tauri typees pour le CRUD.
- [ ] Valider les donnees cote Rust lors de l'import/lecture.
- [ ] Envisager la generation Lua/XML cote Rust pour de meilleures performances.
- [ ] Ajouter des tests Rust si des commandes sont creees.

---

## 12. Priorites recommandees

| Priorite | Section | Amelioration | Impact | Effort |
|----------|---------|-------------|--------|--------|
| **P0** | 1 | Restreindre permissions FS (`$HOME/**` → scopes cibles) | Securite | Faible |
| **P1** | 2 | Extraire GenericEntityList + useEntityCrud | Architecture | Moyen |
| **P1** | 3.1-3.2 | Ecritures atomiques + cache mapper sans race | Fiabilite | Moyen |
| **P1** | 5.1 | `no-explicit-any` en `error` | Qualite | Faible |
| **P1** | 5.2 | Tests mappers, addon gen, composants (> 60 %) | Qualite | Moyen |
| **P1** | 6.1 | Peupler ou retirer Settings | UX | Faible |
| **P1** | 6.2 | Filtres collection globaux (Timeline, Stats, Export) | UX | Faible |
| **P1** | 9.1 | Mises a jour mineures des packages | Maintenance | Faible |
| **P2** | 4 | Validation Lua post-generation | Fiabilite | Faible |
| **P2** | 7.1-7.5 | Tri colonnes, debounce, skeletons, timeline cliquable | UX | Moyen |
| **P2** | 10 | Import / merge de bases | Fonctionnalite | Eleve |
| **P3** | 3.3 | Evaluer remplacement de `neutron-db` | Architecture | Moyen |
| **P3** | 8.1 | Mode sombre | UX | Moyen |
| **P3** | 8.2 | Design tokens SCSS | UX | Moyen |
| **P3** | 8.3 | Accessibilite (ARIA, focus, raccourcis) | UX | Moyen |
| **P3** | 9.2 | Investigation antd 6 / Vite 8 / TS 6 | Maintenance | Eleve |
| **P4** | 11 | Backend Rust (CRUD, Lua gen, tests) | Performance | Eleve |

---

*Document genere le 2026-04-15 — Basee sur la revue complete (architecture + UX/UI + audit packages) de la branche `feat/edition`*
