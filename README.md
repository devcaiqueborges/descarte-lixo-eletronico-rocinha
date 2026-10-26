# Onde descartar lixo eletrônico – Rocinha

Site simples para moradores da Rocinha (Rio de Janeiro) encontrarem onde descartar pilhas, baterias, celulares, notebooks e computadores. Feito com HTML, CSS e JavaScript puro, sem frameworks, pensado para celular, letra grande e internet instável.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Estrutura das telas (início, mapa, lista e "O que posso descartar?") |
| `style.css` | Visual: letra grande, alto contraste e botões grandes |
| `script.js` | Navegação, filtros, mapa, feedback e registro de uso |
| `pontos.js` | Lista dos lugares de descarte |

## Abrir no computador

O mapa só carrega os desenhos das ruas quando a página vem de um endereço `http://`. Por isso, não abra o arquivo com dois cliques. Use uma destas opções:

- **VS Code:** instale a extensão Live Server, clique com o botão direito no `index.html` e escolha "Open with Live Server".
- **Python:** na pasta do site, rode `python -m http.server 8000` e abra `http://localhost:8000`.

## Publicar no GitHub Pages

1. Crie um repositório público no GitHub.
2. Envie os arquivos para a raiz do repositório (Add file > Upload files).
3. Vá em Settings > Pages. Em "Branch", escolha `main` e a pasta `/ (root)`, e salve.
4. Em 1 a 2 minutos o site abre em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Trocar ou adicionar lugares

Edite o `pontos.js`. Para adicionar, copie um bloco `{ ... }` e mude os dados:

- `id`: um número que não se repete.
- `materiais`: use `pilhas`, `baterias`, `celulares`, `notebooks` e `computadores`, em minúsculas e sem acento.
- `lat` e `lng`: no Google Maps, toque e segure no lugar e copie os dois números (com ponto, não vírgula).
- `telefone`: se não tiver, deixe `""`.

Lugar sem `lat` e `lng` aparece na lista, mas não no mapa.

## Registro de uso

O site registra data e hora, tela visitada, filtro usado, ações (como "Como chegar" e WhatsApp) e as avaliações do botão "Gostou do site?". Não pede telefone nem localização. O nome é um campo opcional (só o primeiro nome) no formulário de avaliação e fica na coluna `detalhe`, no formato `nome:Maria`. Cada aparelho recebe um código aleatório só para contar quantos aparelhos usaram o site.

Por padrão os registros ficam só no aparelho (`localStorage`). Para baixar os do seu aparelho, abra o console do navegador e digite `exportarRegistrosCSV()`.

Para juntar os registros de todo mundo, escolha uma opção e mude `enviarPara` no começo do `script.js`.

### Google Sheets

1. Crie uma planilha e, na linha 1, escreva os títulos nas colunas A a I:
   `id`, `dataHora`, `visitante`, `tipo`, `tela`, `filtro`, `avaliacao`, `comentario`, `detalhe`.
2. Vá em Extensões > Apps Script, apague o que estiver lá e cole:

```js
function seguro(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var lote = JSON.parse(e.postData.contents);
  var aba = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  lote.forEach(function (r) {
    aba.appendRow([
      seguro(r.id), seguro(r.dataHora), seguro(r.visitante), seguro(r.tipo),
      seguro(r.tela), seguro(r.filtro), seguro(r.avaliacao),
      seguro(r.comentario), seguro(r.detalhe)
    ]);
  });
  return ContentService.createTextOutput('ok');
}
```

3. Clique em Implantar > Nova implantação > tipo "App da Web", com "Executar como: Eu" e "Quem pode acessar: Qualquer pessoa". Autorize e copie o endereço que termina em `/exec`.
4. No `script.js`, cole o endereço em `urlGoogleSheets` e troque `enviarPara` para `'googleSheets'`.
5. Use o site e confira se as linhas chegaram. O navegador não avisa se o Google recusar o envio, então sempre teste antes. Se você mudar o código do Apps Script depois, faça uma nova implantação.

### Firebase

1. Crie um projeto em console.firebase.google.com e ative o Realtime Database.
2. Na aba Regras, cole o texto abaixo e publique. Ele deixa o site gravar, mas ninguém lê os dados pelo navegador:

```json
{ "rules": { "registros": { ".read": false, ".write": true } } }
```

3. No `script.js`, cole o endereço do banco (algo como `https://meu-projeto-default-rtdb.firebaseio.com`) em `urlFirebase` e troque `enviarPara` para `'firebase'`.
4. Veja os dados em Realtime Database > Dados > registros.

Se a internet cair, os registros ficam guardados no aparelho e são enviados depois.

## Sobre os dados

- Materiais aceitos: mapa de pontos de recebimento da Abree. Horários, telefones e coordenadas: Google Maps. Consulta em 25/10/2026. Se atualizar os dados, atualize a data no rodapé do `index.html`.
- No cadastro da Abree, o Complexo Esportivo da Rocinha (Rua Bertha Lutz, 84) aparece como "Associação Rocinha Surfe Escola – SER" e "Cooperativa ECCO – Rocinha". O horário do site é o do Complexo. Vale confirmar se o coletor funciona no mesmo horário.
- A Loja Vivo (Shopping da Gávea) aparece na Abree como "333 Comércio e Comunicações", e a Casas Bahia, como "Casas Bahia – São Conrado".
- O telefone da Loja TIM ficou em branco porque o número do Google Maps é o 0800 da operadora, não o da loja.

## Créditos

Mapa com [Leaflet](https://leafletjs.com) e dados do [OpenStreetMap](https://www.openstreetmap.org/copyright). Pontos de descarte da [Abree](https://abree.org.br).
