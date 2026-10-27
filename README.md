# Onde descartar lixo eletrônico – Rocinha

Site gratuito e acessível que ajuda moradores da Rocinha (Rio de Janeiro) a encontrar onde descartar pilhas, baterias, celulares, notebooks e computadores, e a entender o que pode ser descartado.

**Acesse o site:** https://devcaiqueborges.github.io/descarte-lixo-eletronico-rocinha/

## Sobre o projeto

Projeto desenvolvido na disciplina **Atividade Extensionista II: Tecnologia Aplicada à Inclusão Digital – Projeto**, do curso superior de tecnologia em Análise e Desenvolvimento de Sistemas da UNINTER.

- **Problema:** muitos moradores, principalmente idosos e pessoas com pouca experiência digital, não sabem onde descartar lixo eletrônico nem encontram essa informação de forma clara.
- **Solução:** um site simples, de leitura fácil e pensado para celular, que mostra os pontos de descarte no mapa e em lista, filtra por material e explica o que pode ser entregue.
- **ODS relacionados:** 11 (Cidades e Comunidades Sustentáveis) e 12 (Consumo e Produção Responsáveis).

## Funcionalidades

- Mapa interativo com os pontos de descarte.
- Lista de lugares com endereço, horário, materiais aceitos e telefone (quando houver).
- Filtro por material: pilhas, baterias, celulares, notebooks e computadores.
- Tela "O que posso descartar?", com orientações simples e aviso para não jogar no lixo comum.
- Botão "Como chegar", que abre o trajeto no Google Maps.
- Botão para compartilhar um ponto pelo WhatsApp.
- Avaliação do site (Gostei, Mais ou menos, Tive dificuldade), com comentário e primeiro nome opcionais.
- Ajuste do tamanho da letra (A− e A+), que o site lembra na próxima visita.

## Acessibilidade

O projeto segue os princípios do Desenho Universal:

- Letra grande, alto contraste e botões de pelo menos 56 px.
- Linguagem simples, poucas opções por tela e ícones junto dos textos.
- Foco visível no teclado, link "Pular para o conteúdo" e rótulos para leitores de tela.
- Layout adaptado a celulares, sem rolagem lateral.
- Se o mapa não abrir por causa da internet, o site oferece "Tentar de novo" e a lista de lugares.

## Tecnologias

HTML, CSS e JavaScript puros, sem frameworks. [Leaflet](https://leafletjs.com) e [OpenStreetMap](https://www.openstreetmap.org/copyright) para o mapa, GitHub Pages para a hospedagem e Google Sheets com Apps Script para o registro de uso.

## Estrutura do repositório

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura das telas (início, mapa, lista e "O que posso descartar?") |
| `style.css` | Visual, acessibilidade e adaptação ao celular |
| `script.js` | Navegação, filtros, mapa, avaliação e registro de uso |
| `pontos.js` | Lista dos pontos de descarte |

## Dados e fontes

- Materiais aceitos: mapa de pontos de recebimento da [Abree](https://abree.org.br).
- Horários, telefones e coordenadas: Google Maps.
- Os pontos foram conferidos pelo autor em outubro de 2026. Horários e regras de cada local podem mudar, por isso o site recomenda ligar antes de ir.

## Privacidade e registro de uso

O site registra data e hora, telas visitadas, filtros usados, ações (como "Como chegar") e as avaliações enviadas. Cada aparelho recebe um código aleatório, usado apenas para contar quantos aparelhos acessaram.

O site **não pede telefone nem localização**. O primeiro nome é opcional e só aparece no formulário de avaliação. Os dados servem apenas para avaliar o projeto acadêmico.

## Limitações e trabalhos futuros

- Os pontos são cadastrados manualmente no `pontos.js`, então precisam de revisão periódica.
- O conjunto de pontos é inicial e pode ser ampliado para outras regiões.
- Possíveis melhorias: painel para cadastrar pontos sem editar código, parcerias com associações de moradores e oficinas presenciais de uso do site.

## Autor

Carlos Caique Borges de Sousa – estudante de Análise e Desenvolvimento de Sistemas (UNINTER).

Mapa com [Leaflet](https://leafletjs.com) e dados do [OpenStreetMap](https://www.openstreetmap.org/copyright). Pontos de descarte da [Abree](https://abree.org.br).
