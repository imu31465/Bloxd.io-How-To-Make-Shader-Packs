[← Parte anterior](04-realism.md)·[Voltar ao manual](README.md)·[Parte seguinte →](06-implementation.md)

# Parte V: Solução de problemas e notas

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

## 17. Erros comuns e soluções

| Sintoma | Solução |
|---|---|
| Não carrega em jogos estritos | Envolva o hook vertex em `#ifndef BLOXD_STRICT` |
| `.alpha` reportado indefinido | Envolva em `#ifdef BLOXD_ALPHA` |
| `blockLight` reportado indefinido | Envolva em `#ifdef BLOXD_LIGHTING`. Envolva funções auxiliares compartilhadas **como funções inteiras** (na v2 o campo existe em todas as variantes: raramente ocorre. Mantenha as guardas usadas para detecção) |
| `Packs can't construct BloxdSurface directly` | Comece de `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Envolva em `#ifndef BLOXD_STRICT` |
| Distância branca e leitosa | Costuma ser névoa dupla. A cor terminada já leva névoa: mantenha sutil a bruma própria e prefira reduzir só saturação |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Aviso: a fila de sementes de luz transbordou em regiões de alta densidade de emissores ou através de fronteiras de regiões, e o cálculo de luz desse chunk foi encurtado. Sem origem "pacote", mas **os buracos de luz ao redor de concentrações de emissores vêm desse limite** — espalhar as fontes de luz pelo mundo evita isso |
| Pacote excluído ao entrar no jogo | Falha a verificação ao vivo do jogo. Revise omissões de guardas |
| A verificação ao vivo do jogo não termina nunca e o pacote cai com `This device couldn't check …` etc. | A verificação tem um prazo forçado de 60 segundos (o estouro conta como `skipped`). Frequente em dispositivos fracos / mundos pesados — alivie o trabalho pesado de vertex e os laços complexos, e tente de novo |
| `pack.json needs "apiVersion": 3.` | Falta `apiVersion` ou não é `3`. Adicione o número `3` (a string `"3"` é rejeitada). Pacotes v1/v2 são rejeitados com `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Sem `pack.json` na raiz do ZIP. Confira não ter compactado a pasta em si |
| `bloxdTerrainVertex must be declared as: fn ...` | Assinatura distinta. Reescreva exatamente como mostrado |
| `bloxdTerrainVertex can't run in strict games...` | Envolva o hook vertex em `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Envolva em `#ifdef BLOXD_LIGHTING` (na v2 o campo existe em todas as variantes: raramente ocorre) |
| Subir `pow(l.skyLight, γ)` jamais aprofunda sombras | `skyLight` é valor pós-curva (cru 0.87 chega como 0.97). Mude para inversão + limiar de R9.12 (seção 10) |
| `... can only be a function's parameter or return type, ...` | `var x: BloxdSurface;` sem inicializar é rejeitado. Construa desde `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | O uniform PackInputs não pode ser referenciado desde pacotes diretamente. Use-o via funções de cabeçalho como `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Tire o prefixo `bloxd_` dos seus identificadores. Só os 6 nomes de hook podem ser definidos |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` é rejeitado. Escreva `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Envolva as chamadas `bloxdOpaqueBehind()` em hooks de terreno com `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Remova `bloxdOpaqueBehind()` de hooks vertex (só surface / light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Recarregue a página e reabra-a com o pacote que lê a profundidade ativado ([Parte VIII](08-apiv2.md) §35). A disponibilidade da textura de profundidade é fixada na geração da página |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Não é erro mas autodesativação em jogos estritos (`shaderPack:offInStrict`). Envolva hooks vertex e `discard` com `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Erro de segunda etapa (Tint do navegador). Ponha entre parênteses operandos de `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` ao carregar zip | Dois `pack.json` (incluindo variantes de maiúsculas/minúsculas). Deixe um |
| `needs the new WebGPU renderer, so remove the renderer override...` | Remova o parâmetro URL `?renderer=` e o `bloxdRenderer` do localStorage, e recarregue ([Parte VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Reescreva desde `bloxdDefaultSurface(s)`. Começar de uma cópia do primeiro parâmetro do hook light (`var out = s;`) também vale |

### IDs de erro da fase de carregamento

Os erros da tela de configurações carregam IDs `shaderPack:load*`. Como ajuda de memória para localizar uma mensagem:

| ID | Significado |
|---|---|
| `loadZipTooBig` | zip acima de 32MB |
| `loadTooManyZipEntries` | mais de 1024 entradas de zip |
| `loadTooManyWgsl` | mais de 256 arquivos `.wgsl` |
| `loadSourceTooBig` | total `.wgsl` acima de 256KB (verificação em fluxo, arquivo por arquivo) |
| `loadManifestTooBig` | `pack.json` acima de 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` não é JSON / não é um objeto |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` ausente / ≠ `3` (pacotes v1/v2 recusados) |
| `loadNoName` / `loadAuthorNotString` | `name` ausente / `author` não é uma string |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compressão não suportada / zip64 / dividido / criptografado |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | caminhos duplicados / não UTF-8 / falha de descompressão / zip danificado |

`loadNoManifest` / `loadDuplicateManifest` (posição / duplicatas de `pack.json`) — veja as linhas correspondentes da tabela acima.

## 18. Direitos e notas

- O recurso de pacotes de shaders é um recurso oficial carregável pela interface do jogo, e criar pacotes é considerado uso previsto. Mas não se confirmou documentação oficial pública
- Pacotes são WGSL puro — execução de JS e acesso à rede são impossíveis por projeto
- Este é um guia não oficial, não a posição oficial dos desenvolvedores. A API pode mudar sem aviso

[← Parte anterior](04-realism.md)·[Voltar ao manual](README.md)·[Parte seguinte →](06-implementation.md)
