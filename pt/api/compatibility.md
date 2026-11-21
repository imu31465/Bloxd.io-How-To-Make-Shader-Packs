# Compatibilidade

> API alvo: 5 · Tipo: referência da API

Esta página explica quais versões da API de shader packs o jogo atual aceita e como os packs salvos para versões anteriores são tratados.

## Versão de API aceita

O jogo atual aceita apenas packs cujo manifesto contenha o valor numérico `5` em `apiVersion`. A string `"5"` não é aceita. Packs criados para API v1–v4 precisam ser migrados antes de carregar.

## Mensagens ao carregar

- `pack.json needs "apiVersion": {{version}}.` — a chave `apiVersion` está ausente
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — a versão informada não corresponde à atual

## Packs salvos para versões anteriores

Um pack salvo para uma versão antiga da API não será executado no jogo atual. A tela de configurações de shader packs informa que o pack pertence a uma versão não compatível. Atualize-o usando o guia de migração correspondente.

## Revalidação de packs salvos

Os packs salvos são revalidados quando os cabeçalhos fornecidos pelo mecanismo ou as definições de nomes de textura mudam. A revalidação acontece automaticamente quando o jogo é carregado. No código do pack, referencie texturas por constantes nomeadas, não por IDs numéricos que podem mudar.

## Compatibilidade do ambiente

- **WebGPU:** shader packs exigem um renderizador compatível com WebGPU.
- **Dispositivos móveis:** shader packs não estão disponíveis em ambientes sem suporte a WebGPU ([Requisitos](../getting-started/requirements.md)).
- **Acesso a texturas:** em configurações do renderizador que não usam o atlas, `bloxdTexel` e `bloxdTextureSize` não oferecem acesso normal às texturas do atlas ([API de texturas](texture-api.md)).

## Suporte às versões da API

| Versão da API | Suporte no jogo atual |
|---|---|
| v1 | Rejeitada ao carregar |
| v2 | Rejeitada ao carregar |
| v3 | Rejeitada ao carregar |
| v4 | Rejeitada ao carregar |
| **v5** | **Atual** |

## Relacionado

- [Migração da v4 para a v5](../history/v5.md)
- [Histórico de versões](../history/)
