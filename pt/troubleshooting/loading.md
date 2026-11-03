# Erros de carregamento

> API alvo: 5 · Estado: Verified

Erros rejeitados na **etapa do carregador** (a primeira barreira), exibidos na linha de status das configurações com ids `shaderPack:load*`.

## "There's no pack.json at the top of the pack."

- **Causa**: não há `pack.json` na raiz do zip (ex. a pasta foi zipada com um nível extra de aninhamento)
- **Verificação**: abra o zip — `pack.json` no nível superior (ou diretamente sob uma única pasta raiz comum)
- **Correção**: zipe o `pack.json` e os arquivos `.wgsl` diretamente. Uma única pasta raiz comum é removida automaticamente ([Estrutura do pacote](../getting-started/pack-structure.md))
- **Prevenção**: mantenha um procedimento de zip fixo; o "Comprimir" do macOS funciona como está (o lixo do SO é excluído automaticamente)

## `loadDuplicateManifest` no carregamento do zip

- **Causa**: dois arquivos `pack.json` (incluindo diferenças de maiúsculas/minúsculas)
- **Correção**: mantenha exatamente um

## Limites de tamanho e quantidade

| Mensagem | Limite |
|---|---|
| `The zip is over 32 MB.` | zip de 32 MB |
| `The zip has more than 1024 entries.` | 1.024 entradas |
| `The pack has more than 256 .wgsl files.` | 256 arquivos `.wgsl` |
| `The pack's .wgsl files are over 256 KB in total.` | 256 KB no total |
| `pack.json is over 64 KB.` | manifesto de 64 KB |

- **Correção**: descarte arquivos `.wgsl` desnecessários / mescle arquivos / corte comentários
- **Prevenção**: esses limites também são tetos práticos de tempo de compilação — trate o crescimento como um sinal de refatoração

## Problemas de formato

Zips divididos (split), zip64, entradas criptografadas e compressão não suportada são rejeitados, cada um com sua mensagem dedicada. Todos os arquivos devem ser UTF-8 válido.

## Referência de ids de erro do carregador

| Id | Significado |
|---|---|
| `loadZipTooBig` | zip acima de 32MB |
| `loadTooManyZipEntries` | mais de 1024 entradas |
| `loadTooManyWgsl` | mais de 256 `.wgsl` |
| `loadSourceTooBig` | mais de 256KB no total (verificação por arquivo em streaming) |
| `loadManifestTooBig` | `pack.json` acima de 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | não é JSON / não é um objeto |
| `loadNoApiVersion` / `loadWrongApiVersion` | ausente / não é `5` ([Erros de versão de API](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | `name` ausente / `author` que não é string |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compressão não suportada / zip64 / dividido / criptografado |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | caminho duplicado / não-UTF-8 / falha de descompressão / zip danificado |
| `loadNoManifest` / `loadDuplicateManifest` | posição do manifesto / duplicação |

## "Ready. Reload the page to use it." mas nada muda

- **Causa**: pacotes precisam de um **recarregamento da página** para ativar
- **Correção**: recarregue depois de selecionar; o status deve se tornar `Ready to use`
- **Nota**: sobrescritas de renderer deixadas para trás (`?renderer=`, localStorage `bloxdRenderer`) fazem os pacotes se recusarem a iniciar — limpe-as e recarregue

## Relacionado

- [Erros de versão de API](api-version.md) · [Estrutura do pacote](../getting-started/pack-structure.md) · [Formato do pacote](../api/pack-format.md)
