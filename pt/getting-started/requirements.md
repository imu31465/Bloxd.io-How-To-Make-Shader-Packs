# Requisitos

> API alvo: 5 · Estado: Verified

## Navegador

Pacotes de shaders são exclusivos do renderizador WebGPU. Você precisa de um navegador com suporte a WebGPU:

- Navegadores baseados em Chromium (Chrome / Edge / Opera etc.) — estáveis no desktop
- Safari 17+ / Firefox (o suporte a WebGPU varia conforme a época)
- **Celular**: o suporte a WebGPU pode ser limitado no iOS / Android. Mencione isso na página de lançamento do seu pacote

Enquanto um pacote estiver instalado, a configuração do jogo para o renderizador WebGPU fica ativada à força.

## Ambiente de desenvolvimento

Não é necessária nenhuma ferramenta especial, embora estas ajudem:

- Um editor de texto (realce de sintaxe WGSL é um diferencial)
- Uma ferramenta de zip para a distribuição; durante o desenvolvimento você pode usar o carregamento por pasta (somente navegadores de desktop)
- Ferramentas de desenvolvedor do navegador — erros de compilação aparecem na interface do jogo e também no console

## Ambientes de verificação no dispositivo

Antes de distribuir, verifique em ([Validação](validation.md)):

1. Um jogo em modo allow (obrigatório se você usa animação de vértices)
2. Um jogo em modo strict (a maioria dos jogos é strict)
3. Um recarregamento de página (pacotes salvos são revalidados automaticamente)

## Ressalva sobre parâmetros de URL

Substituições de renderizador remanescentes em parâmetros de URL ou no localStorage fazem os pacotes se recusarem a iniciar — limpe-as e recarregue.
