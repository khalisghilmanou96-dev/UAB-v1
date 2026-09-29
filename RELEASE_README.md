# UAB — Universal Autonomy Boundary v0.3.1

## Objet

UAB est une couche de contrôle côté propriétaire destinée à encadrer les transitions observables d’un runtime de modèle.

UAB impose notamment :
- gel de la requête et de l’objectif initial ;
- contrôle des transitions avant leur commit ;
- blocage des extensions autonomes de l’objectif ;
- fonctionnement fail-closed ;
- conservation du dernier snapshot sûr ;
- limites d’exécution configurables ;
- limites d’évaluation configurables ;
- alertes de dérive configurables ;
- télémétrie auditable ;
- séparation des rôles du plan de contrôle ;
- intégration via SDK.

UAB ne prétend pas avoir accès au raisonnement interne ou à une chaîne de pensée cachée du modèle.

## Principe de sécurité principal

Toute transition protégée doit passer par le point de contrôle UAB avant son commit.

Le runtime propriétaire doit appeler `propose()` avant de committer une transition protégée.

Aucune action ayant un effet externe ne doit contourner ce point de contrôle.

Le système est conçu pour échouer fermé lorsque l’évaluation ne peut pas fournir une décision sûre.

## Limites configurables

### Execution

- `maxTransitions`: 1000
- `executionTimeoutMs`: 300000
- `maxRequestBytes`: 1048576
- `maxSnapshotBytes`: 4194304

### Evaluation

- `semanticMinConfidence`: 0.90
- `evaluatorTimeoutMs`: 5000
- `maxTransitionMetadataBytes`: 65536
- `failClosed`: true

### Alertes

- `driftRate`: 0.01
- `blocksPerMinute`: 100
- fenêtre d’observation : 60 secondes

## SDK

Le SDK `@uab/sdk` expose :
- `UABRuntime`
- `createUABPolicyConfig`
- `DEFAULT_UAB_POLICY`
- les types de configuration de politique.

Version SDK : `0.3.1`.

## API et contrôle d’accès

Le control plane fournit :
- authentification ;
- sessions HttpOnly signées ;
- RBAC `admin`, `auditor`, `viewer` ;
- isolation du tenant côté serveur ;
- télémétrie signée ;
- métriques ;
- liste des blocs ;
- configuration des alertes ;
- rétention des événements.

## Alertes

Les alertes peuvent être déclenchées par :
- `DRIFT_RATE`
- `BLOCKS_PER_MINUTE`

L’anti-spam conserve l’état d’alerte par tenant et évite de renvoyer une alerte identique tant que les mêmes raisons restent actives.

## Validation effectuée

- `npm run build` : PASS
- `npm test` : PASS
- `npm run chaos` : PASS
- validation des exports SDK : PASS

Tests core : 11 passed, 0 failed.

Tests benchmark : 2 passed, 0 failed.

Chaos :
`PASS: evaluator outage => BLOCK_RETURN, no commit`

Validation SDK :
`PASS: SDK exports and policy configuration`

## Limites de validation

La validation actuelle ne constitue pas une preuve de sécurité ou de performance en production.

Le corpus synthétique ne doit pas être utilisé seul pour déduire un taux de faux positifs en production.

Avant une utilisation commerciale ou une mise en production, les performances doivent être évaluées sur des corpus représentatifs des workloads, modèles, langues, outils et catégories de checkpoints concernés.

## Checklist avant déploiement

- remplacer les credentials de démonstration ;
- remplacer les secrets de démonstration ;
- configurer le stockage de production ;
- configurer les clés de signature ;
- configurer les seuils d’alerte ;
- configurer le webhook si nécessaire ;
- exécuter la suite de tests ;
- exécuter le chaos test ;
- vérifier les permissions RBAC ;
- vérifier l’isolation des tenants ;
- vérifier la rétention ;
- vérifier les métriques et la télémétrie.
