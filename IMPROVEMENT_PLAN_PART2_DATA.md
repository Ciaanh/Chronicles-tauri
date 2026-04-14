# Chronicles-Tauri — Plan d'Amelioration Partie 2 : Donnees

## Sources de reference

| Source | Etendue | Utilisation |
|--------|---------|-------------|
| [`warcraft.wiki.gg/wiki/Timeline`](https://warcraft.wiki.gg/wiki/Timeline) | Tous les ages, dates officielles, personnages, factions | Source primaire — authorite communautaire, reference Blizzard |
| `refs/wow-timelines/LowRoars/Timeline Final/*.md` | Fichiers locaux du projet, 14 eres | Source secondaire — descriptions narratives en anglais, deja curees |

La base de donnees actuelle utilise la convention **Annee 0 = Ouverture du Portail des Tenebres**. Les deux sources de reference utilisent la meme convention.

---

## 1. Etat Actuel de la Base de Donnees

### 1.1 Resume statistique

| Table | Compte | Etat |
|-------|--------|------|
| Collections | 14 | Correctes — toutes les eres predefinies |
| Evenements | 101 | Lacunaires — 8 collections sur 14 sont vides |
| Personnages | 1 | ⛔ Quasi-absent (1 personnage de test) |
| Factions | 0 | ⛔ Completement absent |
| Locales | 210 | Incomplet — aucune traduction |

### 1.2 Couverture des evenements par collection

| ID | Collection | Nb evenements actuels | Etat |
|----|------------|----------------------|------|
| 2 | Origins | 87 | Bien couvert (Mythos → Portail) |
| 1 | Expansions | 12 | Vue globale uniquement (eres sans detail) |
| 6 | GreatWars | 0 | ⛔ Vide |
| 7 | WorldOfWarcraft | 0 | ⛔ Vide |
| 8 | BurningCrusade | 0 | ⛔ Vide |
| 9 | LichKing | 0 | ⛔ Vide |
| 10 | Cataclysm | 0 | ⛔ Vide |
| 11 | MistsOfPandaria | 0 | ⛔ Vide |
| 12 | Warlords | 0 | ⛔ Vide |
| 13 | Legion | 0 | ⛔ Vide |
| 14 | BattleForAzeroth | 0 | ⛔ Vide |
| 15 | Shadowlands | 0 | ⛔ Vide |
| 16 | Dragonflight | 0 | ⛔ Vide |
| 17 | Future | 0 | ⛔ Vide |
| 18 | WarWithin | 1 | Quasi-vide (1 evenement) |

**Estimation : ~150-180 evenements manquants** par rapport aux sources de reference.

### 1.3 Problemes de qualite identifies

| # | Probleme | Impact |
|---|---------|--------|
| QD-1 | 3 evenements avec `timeline=0` au lieu de `1` : id=58 (Sleep of Malfurion), id=82 (The Shadow Pact), id=97 (Corruption of the Horde) | Ces evenements n'apparaissent pas sur la chronologie principale |
| QD-2 | 0 traduction sur 210 locales — toutes sont `enUS` uniquement | Addon inutilisable pour 10 langues WoW supportees |
| QD-3 | Table `characters` : 1 entree de test sans valeur | Aucun personnage jouable dans l'addon Chronicle |
| QD-4 | Table `factions` : completement vide | Aucune faction dans l'addon |
| QD-5 | Evenements des collections individuelles non lies aux factions/personnages (`factionIds: [], characterIds: []`) | Fiches evenements sans contexte |
| QD-6 | `descriptionIds` present dans le JSON mais absent du schema TypeScript (`DB_Event` utilise `chapters`/`chapterIds`) | Incohérence entre schema DB et modele applicatif |

---

## 2. Evenements Manquants par Collection

### 2.1 GreatWars (col=6) — Annees 0 a 25

#### Premiere Guerre (Annees 0-3)
| Annee | Evenement a creer | Type | Personnages cles | Factions cles |
|-------|------------------|------|-----------------|---------------|
| 0 | Arrivee de la Horde par le Portail | Event | Blackhand | Horde, Stormwind |
| 0 | Khadgar devient apprenti de Medivh | Event | Khadgar, Medivh, Garona | |
| 0 | Bannissement des Frostwolves de la Horde | Event | Durotan | Frostwolf clan |
| 1 | Naissance de Thrall / Mort de Durotan et Draka | Event | Thrall, Durotan, Draka, Orgrim | |
| 3 | Mort de Medivh / Orgrim tue Blackhand | Event | Khadgar, Garona, Medivh, Orgrim, Blackhand | Shadow Council |
| 3 | Chute de Stormwind / Assassination du Roi Llane | Battle | Garona, Llane Wrynn, Anduin Lothar | Horde |

#### Deuxieme Guerre (Annees 4-6)
| Annee | Evenement a creer | Type | Personnages cles | Factions cles |
|-------|------------------|------|-----------------|---------------|
| 4 | Formation du Conseil des Sept Nations | Event | Anduin Lothar | Seven Kingdoms |
| 5 | Formation de l'Alliance de Lordaeron | Era | | Alliance of Lordaeron |
| 5 | Fondation de l'Ordre de la Main d'Argent | Event | Uther Lightbringer | Order of the Silver Hand |
| 5 | Alexstrasza capturee a Grim Batol | Event | Alexstrasza, Deathwing | Dragonmaw clan |
| 5 | Gul'dan cree les premiers chevaliers de la mort | Event | Gul'dan | Death knights |
| 6 | Bataille de Hillsbrad | Battle | Zul'jin | Amani, Alliance |
| 6 | Siege de Lordaeron — abandon de Gul'dan | Battle | Gul'dan, Orgrim | Horde |
| 6 | Mort de Lothar au Siege de Roche-Noire | Death | Anduin Lothar, Orgrim | Alliance, Horde |
| 6 | Khadgar detruit le Portail des Tenebres | Event | Khadgar | |

#### Apres la Deuxieme Guerre (Annees 7-20)
| Annee | Evenement a creer | Type | Personnages cles | Factions cles |
|-------|------------------|------|-----------------|---------------|
| 7 | Ner'zhul rouvre le Portail / Draenor eclate → Outland | Event | Ner'zhul | Horde remnant |
| 7 | Ner'zhul transforme en Roi-Liche | Event | Ner'zhul, Kil'jaeden | Burning Legion |
| 10 | Bataille de Grim Batol / Liberation d'Alexstrasza | Battle | Korialstrasz, Alexstrasza, Rhonin, Vereesa | Dragonmaw |
| 10 | Guerre de l'Araignee — Lich King vs Nerubiens | War | Lich King | Scourge, Nerubians |

#### Troisieme Guerre (Annees 20-21)
| Annee | Evenement a creer | Type | Personnages cles | Factions cles |
|-------|------------------|------|-----------------|---------------|
| 20 | Fleaux d'Undeath repand sur Lordaeron | Era | Kel'Thuzad | Scourge |
| 20 | Arthas mission a Stratholme / Epuration de Stratholme | Event | Arthas Menethil, Mal'Ganis | Scarlet Crusade |
| 20 | Arthas trouve Frostmourne — devient Chevalier de la Mort | Event | Arthas Menethil, Mal'Ganis | Scourge |
| 20 | Arthas tue son pere Terenas | Death | Arthas Menethil, Terenas Menethil II | Scourge |
| 21 | Invasion du Scourge dans Quel'Thalas / Corruption du Puits du Soleil | War | Arthas, Sylvanas, Kel'Thuzad | Scourge, Quel'Thalas |
| 21 | Bataille du Mont Hyjal | Battle | Arthas, Thrall, Jaina, Malfurion, Archimonde | Alliance, Horde, Night elves, Scourge |

#### Montee du Roi-Liche (Annees 21-24)
| Annee | Evenement a creer | Type | Personnages cles | Factions cles |
|-------|------------------|------|-----------------|---------------|
| 21 | Illidan tente de detruire le Trone de Glace | Event | Illidan, Maiev, Malfurion, Kael'thas | |
| 21 | Kael'thas et les Elfes de Sang rejoignent Illidan | Event | Kael'thas, Vashj, Illidan | Illidari |
| 23 | Fondation de Durotar et Orgrimmar | Event | Thrall, Rexxar, Jaina | Horde |
| 23 | Les Reprouves rejoignent la Horde | Event | Sylvanas | Forsaken, Horde |

**Sous-total GreatWars estimé : ~25-35 evenements a creer**

---

### 2.2 WorldOfWarcraft (col=7) — Annee 25

| Patch | Evenement a creer | Notes |
|-------|------------------|-------|
| 1.1.0 | Campagne WoW Classique — Les Vieux Dieux repandent leur influence | Arc general |
| 1.1.0 | Ragefire Chasm — Infiltration du Conseil des Ombres a Orgrimmar | Donjon majeur |
| 1.1.0 | Blackrock Depths — Dagran Thaurissan kidnappe Moira Bronzebeard | Arc Nains |
| 1.1.0 | Stratholme — Baron Rivendare et la Croisade Ecarlate | Donjon majeur |
| 1.1.0 | Naxxramas (premiere version) / Invasion de la Mort | Premier raid Scourge |
| 1.6.0 | Nefarian et le Repaire de l'Aile Noire | Raid majeur |
| 1.7.0 | Resurrection de Hakkar le Voleur d'Ame a Zul'Gurub | Raid majeur |
| 1.9.0 | Guerre d'Ahn'Qiraj / Eveil de C'Thun | Guerre mondiale |
| 1.11.0 | Premiere Invasion du Scourge | Evenement mondial |
| Fin | Fin du Classique — tension Alliance/Horde en montee | Transition |

**Sous-total WoW estimé : ~10-15 evenements**

---

### 2.3 BurningCrusade (col=8) — Annees 26-27

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 2.0.3 | Reouverture du Portail / Invasion de Quel'Thalas par les Elfes de Sang | Kael'thas, Velen | Blood Elves, Draenei |
| 2.0.3 | Les Draenei arrivent sur Azeroth via l'Exodar | Velen | Draenei |
| 2.0.3 | Arrivee sur Outland — Liberation de Shattrath | Thrall, Jaina | Aldor, Scryers |
| 2.1.0 | Raid du Temple Noir — Mort d'Illidan | Illidan, Akama, Maiev | Illidari |
| 2.4.0 | Restauration du Puits du Soleil | Kael'thas, Velen, Anveena | Naaru, Blood Elves |

**Sous-total BC estimé : ~8-12 evenements**

---

### 2.4 LichKing (col=9) — Annees 27-28

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 3.0.2 | Deuxieme Invasion du Scourge — retour de Naxxramas | Kel'Thuzad | Scourge, Argent Dawn |
| 3.0.2 | Les Chevaliers de l'Ebon Blade se liberent | Darion Mograine | Knights of the Ebon Blade |
| 3.1.0 | Siege d'Ulduar — Yogg-Saron vaincu | Brann Bronzebeard, Yogg-Saron | Titan-forged |
| 3.3.0 | Assaut sur Citadelle de la Couronne de Glace | Arthas Menethil, Bolvar Fordragon | Scourge |
| 3.3.0 | Mort du Roi-Liche / Bolvar devient le nouveau Roi-Liche | Arthas, Bolvar, Jaina, Sylvanas | |

**Sous-total LichKing estimé : ~8-12 evenements**

---

### 2.5 Cataclysm (col=10) — Annees 28-30

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 4.0.3 | Deathwing brise le Monde — le Cataclysme | Deathwing, Thrall | Black dragonflight |
| 4.0.3 | Retour de Thrall comme Chaman du Monde | Thrall, Aggra | Earthen Ring |
| 4.1.0 | Evenement des Zandalari — Zul'Gurub et Zul'Aman reunifies | Vol'jin | Zandalari |
| 4.2.0 | Ragnaros vaincu au Coeur du Feu | Ragnaros | Firelords |
| 4.3.0 | Mort de Deathwing dans le Dragon Soul | Deathwing, Aspects | Dragon Aspects, Hour of Twilight |

**Sous-total Cataclysm estimé : ~8-12 evenements**

---

### 2.6 MistsOfPandaria (col=11) — Annees 30-31

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 5.0.4 | Decouverte de Pandaria | Anduin Wrynn, Ji Firepaw, Aysa Cloudsinger | Alliance, Horde |
| 5.1.0 | Conflit sur la terre de Krasarang | Varian, Garrosh | Alliance, Horde |
| 5.2.0 | Resurrection de Lei Shen le Roi du Tonnerre | Lei Shen | Mogu |
| 5.4.0 | Siege d'Orgrimmar — Chute de Garrosh Hellscream | Garrosh, Vol'jin, Thrall | Horde, Alliance |
| 5.4.0 | Vol'jin devient nouveau Warchief | Vol'jin | Horde |

**Sous-total MoP estimé : ~8-12 evenements**

---

### 2.7 Warlords (col=12) — Annees 31-32

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 6.0.2 | Garrosh fuit vers le Draenor alternatif / Fil du Temps modifie | Garrosh, Kairoz, Kairozdormu | Iron Horde |
| 6.0.2 | Fondation de la Citadelle de Fer | Grommash Hellscream (alt) | Iron Horde |
| 6.1.0 | Mort de Grommash Hellscream alternatif | Grommash, Gul'dan (alt) | Burning Legion, Iron Horde |
| 6.2.0 | Archimonde vaincu a la Citadelle de Tanaan | Archimonde, Gul'dan | Burning Legion |
| 6.2.0 | Retour de Gul'dan sur Azeroth | Gul'dan | Burning Legion |

**Sous-total Warlords estimé : ~6-10 evenements**

---

### 2.8 Legion (col=13) — Annees 31-33

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 7.0.3 | La Legion envahit le Briseau sacre / Mort de Vol'jin | Vol'jin, Sylvanas, Varian | Alliance, Horde |
| 7.0.3 | Sylvanas devient Warchief | Sylvanas | Horde |
| 7.0.3 | Mort de Varian Wrynn au Briseau sacre | Varian Wrynn, Anduin Wrynn | Alliance |
| 7.0.3 | Formation des Vengeance d'Illidan | Illidan Stormrage | Illidari |
| 7.2.0 | Mort de Kil'jaeden | Kil'jaeden, Khadgar | Burning Legion |
| 7.3.0 | Assaut sur Argus / Destruction de Sargeras | Sargeras, Illidan | Burning Legion, Pantheon |
| 7.3.5 | Sargeras imprigonne — blesse Azeroth | Sargeras | Burning Legion |

**Sous-total Legion estimé : ~10-14 evenements**

---

### 2.9 BattleForAzeroth (col=14) — Annees 33-35

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 8.0.1 | Incendie de Teldrassil par Sylvanas | Sylvanas, Malfurion | Horde, Alliance |
| 8.0.1 | Bataille d'Undercity — Lordaeron perdu | Sylvanas, Anduin | Horde, Alliance |
| 8.1.0 | Siege de Dazar'alor — Mort de Rastakhan | Derek Proudmoore, Rastakhan | Zandalari, Alliance |
| 8.1.0 | Les Zandalari rejoignent la Horde | Talanji, Baine | Horde |
| 8.2.0 | Bataille de Nazmatar / Mort de Azshara | Azshara, N'Zoth | Old Gods, Nagas |
| 8.3.0 | Eveil de N'Zoth | N'Zoth | Black Empire |
| 8.3.0 | Mort de N'Zoth | Wrathion | Old Gods |
| 8.3.0 | Sylvanas abandonne la Horde | Sylvanas, Anduin | Horde, Jailer |

**Sous-total BfA estimé : ~10-14 evenements**

---

### 2.10 Shadowlands (col=15) — Annees 35-37

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 9.0.1 | Sylvanas brise le Voile | Sylvanas, Jailer | Scourge, The Maw |
| 9.0.1 | Anduin corrompu par le Jailer | Anduin, Jailer | |
| 9.1.0 | Assaut sur Sanctum de Domination | Sylvanas, Jailer | |
| 9.1.0 | Sylvanas retrouve son ame / Se rend | Sylvanas | |
| 9.2.0 | Zereth Mortis — Defaite du Geolier | Zovaal (Jailer), Primus | Realms of Death |
| 9.2.5 | Bolvar reprend le Marteau du Geolier | Bolvar, Taelia | |

**Sous-total Shadowlands estimé : ~8-12 evenements**

---

### 2.11 Dragonflight (col=16) — Annees 40-42

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 10.0.2 | Decouverte des Iles des Dragons | Wrathion, Sabellian, Kalecgos | Dragon Aspects |
| 10.0.2 | Eveil de Raszageth — Liberation des Incarnes | Raszageth, Ebyssian | Primal Incarnates |
| 10.1.0 | Mort de Raszageth | Raszageth, Alexstrasza, Neltharion | Dragon Aspects |
| 10.1.0 | Aberrus — Chute de Sarkareth | Sarkareth, Neltharion | Sundered Flame |
| 10.2.0 | Fyrakk s'empare de Teldrassil — Incendie d'Amirdrassil | Fyrakk, Malfurion, Sylvanas reconstituee | Primalists |
| 10.2.0 | Amirdrassil planté — Nouveau monde des arbres | | Night elves |

**Sous-total Dragonflight estimé : ~8-12 evenements**

---

### 2.12 WarWithin (col=18) — Annee 42+

*(1 evenement existant : "Fall of Dalaran")*

| Patch | Evenement a creer | Personnages cles | Factions |
|-------|------------------|-----------------|---------|
| 11.0.2 | Mise du Terre-anneau — Les Nerubes menacent Azeroth | Anduin, Thrall | Earthen |
| 11.0.2 | Xal'atath — La Traitresse revele ses plans | Xal'atath | Void Lords |
| 11.1.0 | Defaite de Xal'atath | Alleria, Anduin | Army of the Light |

**Sous-total WarWithin estimé : ~3-6 evenements**

---

## 3. Personnages Manquants

La table `characters` ne contient qu'un personnage de test. Voici les personnages prioritaires a creer par ere, tires des sources de reference.

### 3.1 Personnages prioritaires — Era Origins (collection 2)

| Personnage | Role | Timeline |
|-----------|------|----------|
| Sargeras | Titan dechU, createur de la Burning Legion | Mythos |
| Medivh | Dernier Gardien de Tirisfal, trahison | Main |
| Aegwynn | Gardienne, mere de Medivh | Main |
| Gul'dan | Premier Warlock orc, traitre supreme | Main |
| Ner'zhul | Chaman Shadowmoon manipule, futur Roi-Liche | Main |
| Durotan | Chieftain des Frostwolves, pere de Thrall | Main |
| Orgrim Doomhammer | Warchief orc, remplacant de Blackhand | Main |
| Blackhand | Premier Warchief orc (marionnette de Gul'dan) | Main |
| Velen | Leader des Draenei, prophete | Main |
| Anduin Lothar | Champion de Stormwind, heros de l'Alliance | Main |
| Malfurion Stormrage | Premier archidruide, Nuit elfe | Main |
| Tyrande Whisperwind | Grande pretresse d'Elune, co-dirigeante | Main |
| Illidan Stormrage | Chasseur de demons, frere de Malfurion | Main |
| Queen Azshara | Reine des Kaldorei, corrompue par Sargeras | Main |

### 3.2 Personnages prioritaires — Grandes Guerres (collection 6)

| Personnage | Role |
|-----------|------|
| Thrall | Fils de Durotan, futur Warchief orc |
| Arthas Menethil | Prince de Lordaeron, futur Roi-Liche |
| Jaina Proudmoore | Archimage, dirigeante de Theramore |
| Sylvanas Windrunner | Ranger-General, future Banshee Queen |
| Khadgar | Apprenti de Medivh, Archimage principal |
| Garona Halforcen | Demi-orque, assassine du Roi Llane |
| Uther Lightbringer | Fondateur de l'Ordre de la Main d'Argent |
| Terenas Menethil II | Roi de Lordaeron, victime d'Arthas |
| Grommash Hellscream | Warchief des Warsong, porteur du fardeau |

### 3.3 Personnages prioritaires — Expansions (collections 7-18)

| Personnage | Collection |
|-----------|-----------|
| Varian Wrynn | WoW / BfA |
| Anduin Wrynn | MoP ... WarWithin |
| Garrosh Hellscream | WoW / MoP / WoD |
| Vol'jin | WoW / MoP / Legion |
| Bolvar Fordragon | WoW / LichKing / Shadowlands |
| Kael'thas Sunstrider | BC |
| Lady Vashj | BC |
| Deathwing | Cataclysm |
| Lei Shen | MoP |
| Yrel | WoD |
| Gul'dan (alternatif) | WoD / Legion |
| N'Zoth | BfA |
| Zovaal (Jailer) | Shadowlands |
| Raszageth | Dragonflight |
| Xal'atath | WarWithin |

**Total estimé de personnages a creer : 50-80 personnages**

---

## 4. Factions Manquantes

La table `factions` est completement vide. Voici les factions prioritaires.

### 4.1 Factions fondamentales (toutes eres)

| Faction | Timeline | Notes |
|---------|---------|-------|
| Alliance | Main | Coalition de races du bien |
| Alliance de Lordaeron | Main | Alliance originelle (2e Guerre) |
| Horde Ancienne | Main | Horde orcish originelle |
| Horde | Main | Horde post-Troisieme Guerre |
| Burning Legion | Mythos/Main | Armee demoniaque de Sargeras |
| Old Gods/Dieux Anciens | Mythos/Main | Entites du Neant |
| Conseil des Ombres | Main | Organisation secrete de Gul'dan |
| Marteau du Crepuscule | Main | Culte des Vieux Dieux (Cho'gall) |

### 4.2 Factions par ere

| Era | Factions a creer |
|-----|-----------------|
| Origins | Kirin Tor, Cenarion Circle, Farstriders, Kingdom of Quel'Thalas, Dragonmaw clan, Frostwolf clan, Order of Tirisfal, Bronze/Blue/Red/Green/Black Dragonflights |
| Great Wars | Order of the Silver Hand, Argent Dawn, Seven Kingdoms, Scarlet Crusade, Scourge, Forsaken |
| WoW | Argent Crusade, Cenarion Expedition, Sha'tar, Scryers, Aldor |
| BC | Sha'tar, Blood Elves government, Aldor, Scryers |
| WotLK | Argent Crusade, Knights of the Ebon Blade, Ashen Verdict |
| Cataclysm | Earthen Ring, Avengers of Hyjal, Therazane, Hour of Twilight |
| MoP | Golden Lotus, Shado-Pan, August Celestials, Klaxxi |
| WoD | Iron Horde, Council of Exarchs, Frostwolf clan (alt), Laughing Skull |
| Legion | Illidari, Army of the Light, Armies of Legionfall |
| BfA | Zandalari Empire, Proudmoore Admiralty, Champions of Azeroth |
| Shadowlands | Covenants (Kyrian, Necrolords, Night Fae, Venthyr), The Maw Walkers |
| Dragonflight | Dragon Isles Expedition, Valdrakken Accord, Loamm Niffen, Primalists |
| WarWithin | Assembly of the Deeps, Hallowfall Arathi, General's Expedition |

**Total estimé de factions a creer : 60-80 factions**

---

## 5. Locales — Perimetre Anglais Uniquement

**Perimetre actuel : `enUS` uniquement.** Les traductions vers les 10 autres langues WoW (frFR, deDE, esES, esMX, itIT, ptBR, ruRU, koKR, zhCN, zhTW) sont hors scope pour cette phase.

Toutes les locales a creer (labels, chapitres, descriptions) seront renseignees en `enUS` uniquement. Le champ `translations` restera vide.

---

## 6. Corrections de Qualite a Effectuer

Ces corrections sont rapides et sans risque, a faire en priorite absolue.

| ID | Correction | Action |
|----|-----------|--------|
| QD-1 | Evenement id=58 `Sleep of Malfurion` : `timeline=0` → `timeline=1` | Editer le JSON directement |
| QD-1 | Evenement id=82 `The Shadow Pact` : `timeline=0` → `timeline=1` | Editer le JSON directement |
| QD-1 | Evenement id=97 `Corruption of the Horde` : `timeline=0` → `timeline=1` | Editer le JSON directement |
| QD-6 | Schema `DB_Event` : `descriptionIds` present dans le JSON mais absent du modele TypeScript | Aligner le schema ou migrer vers `chapterIds` |

---

## 7. Sources en Ligne Complementaires

Pour la saisie des evenements manquants, ces pages du wiki sont les plus importantes :

| Page | Utilite |
|------|---------|
| [`warcraft.wiki.gg/wiki/Timeline`](https://warcraft.wiki.gg/wiki/Timeline) | Timeline complete avec tous les evenements et dates |
| [`warcraft.wiki.gg/wiki/First_War`](https://warcraft.wiki.gg/wiki/First_War) | Detail de la Premiere Guerre |
| [`warcraft.wiki.gg/wiki/Second_War`](https://warcraft.wiki.gg/wiki/Second_War) | Detail de la Deuxieme Guerre |
| [`warcraft.wiki.gg/wiki/Third_War`](https://warcraft.wiki.gg/wiki/Third_War) | Detail de la Troisieme Guerre |
| [`warcraft.wiki.gg/wiki/World_of_Warcraft`](https://warcraft.wiki.gg/wiki/World_of_Warcraft) | Evenements de WoW Classic |
| Sous-pages par extension (Burning_Crusade, etc.) | Evenements par extension |

---

## 8. Outillage pour la Saisie de Donnees

Etant donne l'ampleur du travail (150-200 evenements, 50-80 personnages, 60-80 factions, 3600+ chaines de traduction), voici les outils a envisager pour accelerer la saisie.

### 8.1 Import de donnees par script

- [ ] Creer un **script d'import JSON** qui prend un fichier de donnees structurees (evenements/personnages/factions) et les injecte dans `ChroniclesDB.json` en respectant le schema (auto-increment IDs, creation automatique des locales associees)
- [ ] Creer un **format d'import intermediaire** (JSON simplifie ou CSV) pour saisir rapidement les evenements sans passer par l'UI

### 8.2 Import depuis le Markdown de reference

Les fichiers `refs/wow-timelines/LowRoars/Timeline Final/*.md` sont deja structures et contiennent les descriptions en enUS. Un parseur Markdown pourrait extraire automatiquement :
- Le nom de l'evenement
- La date (yearStart)  
- La description (→ locale enUS pour le chapitre)
- [ ] Creer un **parseur Markdown → JSON** pour les fichiers de reference locaux

---

## 9. Roadmap de Saisie de Donnees

### Phase 0 — Corrections immédiates (< 1 jour)
- [ ] Corriger les 3 evenements avec `timeline=0`
- [ ] Resoudre l'incoherence `descriptionIds` / `chapterIds` dans le schema

### Phase 1 — Grandes Guerres (priorite lore maximale)
- [ ] Creer les ~30 evenements de la collection GreatWars (col=6)
- [ ] Creer les 14-20 personnages cles (Thrall, Arthas, Jaina, Sylvanas, Khadgar, Garona, Uther...)
- [ ] Creer les 8-12 factions fondamentales (Alliance, Horde, Burning Legion, Scourge, Order of the Silver Hand...)
- [ ] Lier evenements ↔ personnages ↔ factions dans les enregistrements

### Phase 2 — WoW Classique et BC/LichKing
- [ ] Creer les ~25 evenements des collections WorldOfWarcraft, BurningCrusade, LichKing
- [ ] Creer les personnages et factions associes
- [ ] Completer les `factionIds`/`characterIds` des evenements Origins existants

### Phase 3 — Expansions modernes (Cataclysm → WarWithin)
- [ ] Creer les ~80-100 evenements restants
- [ ] Creer les personnages et factions modernes
- [ ] Lier tous les evenements aux entites existantes

### Phase 4 — Enrichissement et Qualite
- [ ] Ajouter des descriptions narratives (`chapters`) aux evenements qui n'ont que des labels
- [ ] Verifier la coherence des dates avec le wiki officiel
- [ ] Ajouter les liens `link` vers les pages wiki correspondantes pour chaque evenement

---

## 10. Recapitulatif des Volumes

| Element | Existant | A creer (estimé) | Total cible |
|---------|---------|-----------------|------------|
| Evenements | 101 | ~155-175 | ~260-280 |
| Personnages | 1 | ~70-100 | ~75-105 |
| Factions | 0 | ~65-80 | ~65-80 |
| Locales enUS | 210 | ~250-350 | ~460-560 |

---

*Document genere le 2026-04-13 — Sources : warcraft.wiki.gg/wiki/Timeline + refs/wow-timelines/LowRoars/*
