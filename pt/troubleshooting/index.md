# Solução de problemas

Erros e problemas visuais, localizáveis **por sintoma**. As páginas seguem a estrutura: sintoma → causa → como verificar → correção → prevenção.

## Índice de sintomas

| Sintoma | Página |
|---|---|
| Pacote não carrega / erros de zip e pack.json | [Erros de carregamento](loading.md) |
| Mensagens de `apiVersion` / pacotes antigos que não rodam | [Erros de versão de API](api-version.md) |
| Não compila / `must be declared as` / sintaxe WGSL | [Erros de compilação](compilation.md) |
| Erros de validação (nomes reservados, contrato strict, `reaches`) | [Erros de validação](validation.md) |
| Falha só em algumas variantes / descartado em jogos estritos | [Problemas específicos de variantes](variants.md) |
| Visual errado (bruma branca, sem sombras, noite estranha) | [Problemas visuais](visual.md) |
| Erros de nome de textura / `did you mean` | [Problemas de texturas](textures.md) |
| Problemas de brilho / sombra / névoa | [Problemas de iluminação](lighting.md) |
| Problemas de modelo / entidade / encantamento | [Problemas de modelos](models.md) |
| Lento / descartado pela verificação no dispositivo | [Desempenho](performance.md) |
| Jurídico, segurança, perguntas comuns | [FAQ](faq.md) |

> API alvo: 5 · Build alvo: `ab90qa` (verificado em produção 2026-11-03) · Estado: Verified (mensagens registradas literalmente do validador e do carregador em produção)

## Onde os erros aparecem

1. **Configurações → linha de status do Shader Pack** — erros da etapa do carregador (os ids são `shaderPack:load*`)
2. **A lista de erros da tela do carregador** — validação e compilação (arquivo:linha + variante)
3. **O console das devtools do navegador** — erros de execução e da etapa 2 (compilador WGSL do navegador)

A verificação de carregamento em 3 etapas está detalhada em [Primeiros passos: validação](../getting-started/validation.md).
