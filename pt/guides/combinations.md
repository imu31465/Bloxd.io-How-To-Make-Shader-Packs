# Combinar com outros pacotes quando o shader sozinho bate no limite



Como pacotes não podem adicionar nem amostrar texturas, não tente resolver relevos finos de material ou imagens do céu só com shaders. O repositório público de pacotes de texturas para Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) trata texturas, skybox, modelos etc. por outra via.

Como referência, distribuições comunitárias "cinematic shader" analisadas num caso resultaram ser pacotes de texturas (texturas 128x128 sem `pack.json` / `.wgsl`).

Na prática, **ajuste luz e cor com shaders e cubra materiais e céu com um pacote de recursos combinado**. Mas verifique co-uso e ordem de carga segundo a implementação e ajustes do jogo.

Os pacotes de texturas têm especificação própria (para referência): o limite de tamanho é 25MB medido como o comprimento da string JSON codificada em base64; codificar um PNG em base64 infla +33%, então o teto prático para imagens cruas é ~18–19MB. O CSS é processado por um analisador regex simples — evite aninhamento e comentários.
