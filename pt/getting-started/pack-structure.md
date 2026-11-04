# Estrutura do pacote

> API alvo: 5 · Build alvo: `xkg8x` · Estado: Verified

## Formato de distribuição

- **Formato**: um único `.zip`, ou uma pasta (o carregamento por pasta é somente para navegadores de desktop)
- **Conteúdo**: um `pack.json` (no nível superior do pacote; sem distinção entre maiúsculas e minúsculas) + 1–256 arquivos `.wgsl`
- Vários arquivos `.wgsl` são concatenados em um único módulo, então dividir e usar subdiretórios não custa nada. Não há restrições sobre nomes de arquivo. A concatenação acontece em **ordem de dicionário por nome de caminho** (declarações de escopo de módulo são independentes da ordem, então isso só importa para código que dependa da ordem de inicialização de `var`). Arquivos que não são `.wgsl` (READMEs etc.) são ignorados

## Limites de tamanho e formato

| Item | Limite | Mensagem ao exceder |
|---|---|---|
| tamanho do zip | 32 MB | `The zip is over 32 MB.` |
| entradas do zip | 1.024 | `The zip has more than 1024 entries.` |
| tamanho de `pack.json` | 64 KB (UTF-8) | `pack.json is over 64 KB.` |
| quantidade de arquivos `.wgsl` | 256 | `The pack has more than 256 .wgsl files.` |
| fonte `.wgsl` total | 256 KB (UTF-8) | `The pack's .wgsl files are over 256 KB in total.` |
| forma do zip | sem zip64 / dividido / criptografado; store ou deflate; sem caminhos duplicados | cada um rejeitado com sua própria mensagem |

Todos os arquivos devem ser UTF-8 válido.

## Dicas de compactação

Um zip que guarda tudo sob uma única pasta raiz comum tem esse prefixo removido automaticamente (o "Comprimir" do macOS funciona como está; `__MACOSX`, arquivos com prefixo `._` e `.DS_Store` são excluídos automaticamente). Arquivos soltos no nível da raiz quebram a detecção do nível superior, então o método mais seguro é zipar `pack.json` e os arquivos `.wgsl` diretamente (verifique se `pack.json` acaba na raiz do zip).
