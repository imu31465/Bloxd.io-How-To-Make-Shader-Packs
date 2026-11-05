# pack.json (manifesto)

> API alvo: 5 · Build alvo: `bny9u` (verificado em produção em 2026-11-05) · Estado: Verified

`pack.json` é o manifesto do pacote — exatamente um objeto JSON na raiz do zip.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `apiVersion` | número | obrigatório | Deve ser **exatamente igual a `5`** (`===` estrito). Uma string `"5"` ou qualquer outro tipo falha, reportado com a grafia JSON |
| `name` | string | obrigatório | Não vazio depois de aparar espaços. Mostrado na interface de configurações |
| `author` | string | opcional | Pode ser omitido; deve ser uma string se estiver presente |

Todos os demais campos são ignorados pelo carregador.

## O que acontece quando a versão não corresponde

O carregador compara `manifest.apiVersion !== 5` de forma estrita e **falha no instante mesmo do carregamento**. Mensagens, verbatim do dicionário i18n em execução:

- `pack.json needs "apiVersion": {{version}}.` — a chave está ausente por completo
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — a chave existe, mas não é 5

Pacotes mais antigos salvos anteriormente não lançam exceções; eles resolvem para `{kind: "none", reason: "otherApiVersion"}` e ficam **silenciosamente inativos**. A aba de configurações de pacotes de shaders explica o porquê:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

Para migrar a partir de v1–v4, veja o [Histórico de versões](../history/).
