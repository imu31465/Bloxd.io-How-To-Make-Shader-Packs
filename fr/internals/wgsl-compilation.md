# Compilation WGSL

> API cible : 5 · Build cible : `bny9u` · État : Analyzed (restauré depuis le bundle en production)

La deuxième étape de validation — la compilation réelle via le compilateur WGSL du navigateur — et les stubs de validation de la v5.

## Pourquoi deux étapes

Le contrôle de types de la validation statique est incomplet, donc certaines erreurs n'apparaissent qu'ici (p. ex. les exigences de précédence d'opérateurs de WGSL comme `mixing '*' and '^' requires parenthesis`). Les erreurs apparaissent en jeu avec le nom de la variante ([Erreurs de compilation](../troubleshooting/compilation.md)).

## Génération des stubs de validation

Le moteur synthétise des stubs pour le code qui a passé la validation statique (restauré depuis le module 29866) :

- la table de stubs de types :

| Type | Valeur de stub |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` etc. |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` etc. |

- les structs se construisent récursivement — chaque champ rempli avec des valeurs de stub (récursion sur les structs imbriqués)
- les points d'entrée synthétisés :

```wgsl
var<private> bloxdValidationP: vec4f;

fn <special fn>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <stub value>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<stubs>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<stubs>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<stubs>));
    return vec4f(o.colour, 1.0);
}
```

La validation compile littéralement « du WGSL qui appelle vos hooks avec des entrées stub » dans le navigateur, faisant remonter les violations de syntaxe, de types et de fonctionnalités du langage.

## Restauration des noms dans les messages d'erreur

En greffant les appels de hooks, le moteur garde une table de correspondance d'identifiants (`originalNames`). Les identifiants dans les erreurs du navigateur sont **remappés vers vos noms d'origine**, et `sourceOf(lineNum)` remappe les numéros de lignes greffées vers (fichier, ligne) — vous lisez les erreurs sur votre propre code, pas sur le texte transformé.

## Revalidation à l'exécution à l'entrée en jeu

`checkCompilation` s'exécute à chaque entrée en jeu et compile réellement chaque matériau de terrain existant (plus stricte que le contrôle de l'écran de réglages). L'échec exclut le pack de ce jeu. Le contrôle a un délai d'expiration forcé de 60 secondes ([Performance](../troubleshooting/performance.md)).

## Voir aussi

- [Erreurs de compilation](../troubleshooting/compilation.md) · [Validation des shaders](shader-validation.md) · [Premiers pas : Validation](../getting-started/validation.md)
