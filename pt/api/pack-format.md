# Formato do pack

> API alvo: 5 · Tipo: referência da API

Esta página resume o manifesto, os limites do arquivo ZIP e o uniform do pack. Para ver as etapas de configuração, consulte [Primeiros passos](../getting-started/manifest.md).

## pack.json

Coloque `pack.json` na raiz do arquivo ZIP. Ele deve ser um objeto JSON.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `apiVersion` | number | Sim | Defina o valor numérico `5`. Uma string não é aceita |
| `name` | string | Sim | Nome não vazio após remover os espaços externos |
| `author` | string | Não | Nome do autor |
| `keepCircleShadows` | boolean | Não | Defina como `true` para manter as sombras circulares tradicionais ao usar a API de sombras |

## Limites do carregador

| Item | Limite |
|---|---:|
| Arquivos `.wgsl` por pack | 256 |
| Fonte `.wgsl` total | 256 KB |
| `pack.json` | 64 KB |
| Arquivo ZIP | 32 MB |
| Entradas ZIP | 1.024 |

Arquivos ZIP divididos, Zip64, entradas criptografadas e métodos de compactação não suportados não são aceitos. Salve todos os arquivos em UTF-8 e não inclua caminhos duplicados no arquivo.

## Uniform do pack

O uniform do pack tem 80 bytes e é vinculado em `@group(3) @binding(0)`.

| Offset | Campo | Tipo |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

O tamanho mínimo do vínculo do uniform é 80 bytes. Os outros vínculos do grupo 3 são a textura de profundidade de cena para variantes Liquid e o buffer de armazenamento `bloxdSpTextureLayers`.

## Relacionado

- [Criar o manifesto](../getting-started/manifest.md)
- [Referência da API](./)
- [Guia de migração da API v5](../history/v5.md)
