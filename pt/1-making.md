[Voltar ao manual](README.md)·[Parte seguinte →](2-api.md)

# Parte I: Criar pacotes

## 1. Visão geral e pré-requisitos

- Pacotes de shaders são **somente para o renderizador WebGPU**. Enquanto um pacote está instalado, o renderizador WebGPU é ativado à força nas configurações
- Pacotes são escritos em um **subconjunto restrito de WGSL**. Afetam apenas a aparência do **terreno (terrain) e líquidos (liquid)**
- O que você pode fazer: mudar cores, transparência e emissão; reconstruir a iluminação; sombras estilo projeção (R9.12); animação de vértices (só em certos jogos)
- O que você não pode fazer: adicionar/amostrar texturas, pós-processamento (bloom etc.), sombras pixeladas que giram com o sol (mapas de sombra) nem reflexos reais (SSR), nem afetar céu ou entidades
- O que dá para fazer (mas passa despercebido): **sombras estilo projeção com `skyLight` (oclusão de céu por voxels)** — dá para escurecer claramente sob árvores e telhados (R9.12). Quebrar blocos faz o LightEngine recalcular na hora, então as sombras acompanham em tempo real
- **A maioria dos jogos usa o modo estrito** (sem animação de vértices, sem `discard`). Projete pacotes de distribuição geral para funcionar no modo estrito

## 2. Início rápido

1. Crie uma pasta e coloque `pack.json` e arquivos `.wgsl` nela
2. Carregue o zip ou a pasta em configurações do jogo → Shader Pack
3. Corrija erros e recarregue (ver [Parte V](5-troubleshooting.md))
4. Teste em jogos compatíveis
5. Compacte em zip ao terminar e distribua

## 3. Estrutura do pacote

- **Formato de distribuição**: um único `.zip`, ou uma pasta (carregar pasta é só em navegadores desktop)
- **Conteúdo**: um `pack.json` (no nível superior do pacote; sem diferenciar maiúsculas) + 1–256 arquivos `.wgsl`
- Múltiplos `.wgsl` são concatenados e tratados como um módulo, então dividir e usar subdiretórios é livre. Sem restrições de nomes. Arquivos não `.wgsl` (READMEs etc.) são ignorados
- Dica de compactação: se um zip guarda tudo sob uma pasta raiz comum, esse prefixo é removido automaticamente (zips do "Comprimir" do macOS funcionam como estão). Mas arquivos extras na raiz quebram a detecção do nível superior; o mais seguro é entrar na pasta e compactar `pack.json` e os `.wgsl` diretamente (confira que `pack.json` fique na raiz do ZIP)

| Item | Limite |
|---|---|
| tamanho do zip / nº de entradas | 32MB / 1024 |
| tamanho do pack.json | 64KB, UTF-8 |
| tamanho total .wgsl | 256KB, UTF-8 |
| formato zip | zip64, divididos e criptografados são rejeitados |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `apiVersion` | obrigatório | Deve coincidir exatamente com `2`. Pacotes com `1` são rejeitados com `shaderPack:loadWrongApiVersion` |
| `name` | obrigatório | Não pode estar vazio. Exibido na interface de configurações |
| `author` | opcional | Pode omitir. Valores não-string (números etc.) são erros |

Outros campos são ignorados.

## 5. Modelo mínimo

Um pacote funcional só com `pack.json` (seção 4) e este `pack.wgsl`:

```wgsl
// Pacote mínimo com leve tom quente
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Regras a seguir:

- Nunca **construa as structs de saída diretamente** (`BloxdSurface(...)` é erro). Comece sempre de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` e modifique campos. Exceção: o primeiro parâmetro do hook light (`s: BloxdSurface`) tem o tipo de saída: `var out = s;` também vale
- `var x: BloxdSurface;` sem inicializar (só anotação de tipo) também é erro
- Parâmetros dos hooks são **somente leitura**. Para mudá-los, copie antes, ex. `var sv = s;`
- Você não pode usar o prefixo `bloxd_` nos seus identificadores (salvo os 6 nomes de hook)
- Escreva constantes com `const` (`#define` não aceita valores)

## 6. Os 6 hooks

Todos opcionais. Assinaturas devem coincidir exatamente nos tipos (nomes de parâmetros são livres).

| Hook | Papel |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Animação de vértices do terreno. **Indisponível no modo estrito** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Cor, transparência e emissão do terreno. `s.colour` é textura × cor de vértice |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Cor final do terreno. Chamado na **etapa final do fragmento**, e seu retorno vira a cor final como está |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (mesmas formas) | Versões para líquidos. `alpha` age como transparência do líquido |

Regras de fallback:

- Sem hook de líquido, **usa-se o hook de terreno de mesmo nome** (nunca o inverso). Escrever só surface aplica o mesmo efeito aos líquidos
- Sem hook light, vale o comportamento padrão (`engineColour + emission × fogVisibility`)
- Se descartar `engineColour` e reconstruir da cor base, reaplique a névoa você mesmo: `mix(l.fogColour, col, l.fogVisibility)`. Ao somar emissão, multiplique-a antes por `fogVisibility`

## 7. 8 variantes e guardas

Você escreve um código só, mas ele deve compilar nas **8 combinações de {strict, allow} × {iluminação on, iluminação off} × {terreno, líquido}**.
Só existem `#define` (só flag, sem valores) / `#ifdef` / `#ifndef` / `#else` / `#endif`. `#` deve abrir sua linha (vale dentro de funções).

| Guarda | Significado | Uso |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Só fora do estrito (allow) | Envolve todo o hook vertex e `discard` |
| `#ifdef BLOXD_LIGHTING` | Só com iluminação ligada | Envolve código que toca `blockLight`, `skyLight`, `ambientLightColour` etc. **Envolva funções auxiliares compartilhadas (fn de escopo de módulo) como funções inteiras** (proteger só o ponto de chamada não basta) |
| `#ifdef BLOXD_ALPHA` | Quando existe o campo `alpha` (sempre em líquidos, em terreno só em allow) | Envolve código que toca `alpha` |

## 8. Recursos da linguagem disponíveis e proibições

Disponível:

- Funções embutidas do WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` etc.)
- Seus próprios `fn` / `struct` / `const` / `alias` / `var<private>`, mais `let` e fluxo de controle (if/for/while/switch etc.) dentro de funções
- Derivadas (`dpdx` / `dpdy` / `fwidth`) só em hooks surface/light (etapa de fragmento). Não em vertex
- Arrays `const` (ex. LUTs de paleta), ponteiros (`ptr<function, T>`), matrizes (`mat3x3f` etc.)
- Definições de flags `#define NOME` + ramificação `#ifdef`

Proibido / cuidado:

- **Sem texturas**: tipos `texture_*` / `sampler` são inutilizáveis. Construa detalhe proceduralmente com ruído hash etc.
- **`discard` é proibido no modo estrito** (envolva com `#ifndef BLOXD_STRICT`)
- `@attribute` / `enable` / `requires` / `override` são proibidos. Como `enable f16;` não pode ser escrito, **tipos f16 são efetivamente inutilizáveis**
- Atributos `@builtin` também são proibidos, então `fragCoord` (coordenadas de tela) e `vertex_index` não podem ser lidos
- **Não use `let` de escopo de módulo** (use `const` ou `var`)
- `atomic` é inutilizável
- Coordenadas são locais-noa. Some `bloxdOriginOffset()` para coordenadas de mundo. Coordenadas de bloco são `bloxdFaceBlock(position, normal)`

## 9. Validação, testes e distribuição

O carregamento executa estas verificações em ordem:

1. Verificações de limite do carregador (limites da seção 3)
2. Compilação estática (as 8 variantes)
3. Compilação real no WebGPU do navegador (a validação estática não verifica todos os tipos; certo código só falha aqui — evite as armadilhas da seção 8)

Passos:

1. Carregue o zip / pasta em configurações → Shader Pack
2. Confira o status. Sucesso é "Ready to use". Com "Saved, but it won't run until you fix these errors...", corrija os erros listados (arquivo:linha + variante) e recarregue
3. Recarregue a página para ativar. Remova antes qualquer override de renderizador em parâmetros URL ou localStorage, ou o pacote se recusará a iniciar
4. Teste primeiro em jogos permissivos e depois em jogos estritos (a maioria). Animação de vértices só funciona em jogos allow
5. Para distribuir, compacte com `pack.json` no topo (dentro dos limites da seção 3). Recarregar a mesma tela substitui o pacote; Remove Pack o exclui. A revalidação após atualizações do jogo roda sozinha ao carregar a página
