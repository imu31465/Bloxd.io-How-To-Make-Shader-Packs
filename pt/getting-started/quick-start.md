# Início rápido

> API alvo: 5 · Build alvo: `xkg8x` (verificado em produção em 2026-11-04) · Estado: Verified

Seu primeiro pacote em cinco minutos.

## 1. Crie os arquivos

Crie uma pasta com `pack.json` e `pack.wgsl`:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — um pacote mínimo de tonalidade quente:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> O cabeçalho do motor (constantes, estruturas, funções) é prefixado automaticamente a cada pacote no carregamento — você nunca o escreve por conta própria. O cabeçalho completo está reproduzido em [Interioridades do motor](../internals/engine-header.md).

## 2. Carregue-o no jogo

1. Abra as configurações → Shader Pack e carregue o zip ou a pasta (o carregamento por pasta é somente para navegadores de desktop)
2. Confira o estado: logo depois de selecioná-lo você verá "Ready. Reload the page to use it." — após um **recarregamento da página**, "Ready to use" significa sucesso
3. Se você vir "Saved, but it won't run until you fix these errors...", corrija os erros listados (arquivo:linha + variante) e recarregue

## 3. Verifique

1. Teste primeiro em um jogo permissivo
2. Depois em um jogo em modo strict (a maioria dos jogos é strict)
3. A animação de vértices só funciona em jogos marcados como allow

## 4. Distribua

Compacte em um zip — veja [Distribuição](distribution.md).

## Travou?

- O que os erros significam → [Solução de problemas](../troubleshooting/)
- Como escrever hooks → [Hooks de shader](hooks.md)
- O template completo de 9 hooks está na próxima página, [Hooks de shader](hooks.md)
