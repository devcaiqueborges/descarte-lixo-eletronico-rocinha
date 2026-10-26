(() => {
  'use strict';

  const CONFIG = {
    // 'localStorage' (só no aparelho), 'googleSheets' ou 'firebase'. Veja o README.
    enviarPara: 'googleSheets',
    urlGoogleSheets: 'https://script.google.com/macros/s/AKfycbwy65etXAia1CssF875P2B6QfIltGt-4OALt9xJMKapun53ucF7y5Ua1pkemrDz9ZLklA/exec',
    urlFirebase: '',
    centroMapa: [-22.9885, -43.2480],
    zoomMapa: 16,
    // 'coordenadas' ou 'endereco'
    comoChegarUsa: 'coordenadas',
    leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    leafletJs: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  };

  const CHAVE_REGISTROS = 'rocinha_registros';
  const CHAVE_VISITANTE = 'rocinha_visitante';
  const CHAVE_LETRA = 'rocinha_letra';
  const MAX_REGISTROS = 2000;
  const CAMPOS = ['id', 'dataHora', 'visitante', 'tipo', 'tela', 'filtro', 'avaliacao', 'comentario', 'detalhe'];

  const TELAS = {
    inicio: 'Onde descartar lixo eletrônico',
    mapa: 'Mapa dos lugares',
    lista: 'Lista de lugares',
    info: 'O que posso descartar?'
  };

  const MATERIAIS = {
    pilhas: { nome: 'Pilhas', emoji: '🔋' },
    baterias: { nome: 'Baterias', emoji: '⚡' },
    celulares: { nome: 'Celulares', emoji: '📱' },
    notebooks: { nome: 'Notebooks', emoji: '💻' },
    computadores: { nome: 'Computadores', emoji: '🖥️' }
  };

  const NIVEIS_LETRA = [20, 24, 28, 32];

  let telaAtual = 'inicio';
  let filtroAtual = 'todos';
  let pontoSelecionado = null;
  let nivelLetra = 0;
  let mapa = null;
  let camada = null;
  let marcadores = {};
  let promessaLeaflet = null;
  let enviando = false;

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => Array.from(raiz.querySelectorAll(seletor));

  const el = (tag, props, filhos) => {
    const e = document.createElement(tag);
    Object.keys(props || {}).forEach(k => {
      if (k === 'class') e.className = props[k];
      else if (k === 'texto') e.textContent = props[k];
      else e.setAttribute(k, props[k]);
    });
    (filhos || []).forEach(f => {
      if (f) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
    return e;
  };

  const btnVoltar = $('#btn-voltar');
  const btnInicio = $('#btn-inicio');
  const btnMenos = $('#btn-letra-menos');
  const btnMais = $('#btn-letra-mais');

  const definirDesativado = (botao, sim) => botao.setAttribute('aria-disabled', sim ? 'true' : 'false');
  const estaDesativado = botao => botao.getAttribute('aria-disabled') === 'true';
  const telaValida = nome => Object.prototype.hasOwnProperty.call(TELAS, nome);

  // localStorage com reserva na memória, para quando o navegador bloqueia o armazenamento
  const memoria = {};

  const lerLS = (chave, padrao) => {
    try {
      const v = localStorage.getItem(chave);
      if (v !== null) return JSON.parse(v);
    } catch (e) { /* sem acesso */ }
    return chave in memoria ? memoria[chave] : padrao;
  };

  const gravarLS = (chave, valor) => {
    memoria[chave] = valor;
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem acesso */ }
  };

  // registro de uso

  const idCurto = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const idVisitante = () => {
    let id = lerLS(CHAVE_VISITANTE, null);
    if (!id) {
      id = 'v-' + idCurto();
      gravarLS(CHAVE_VISITANTE, id);
    }
    return id;
  };

  const dataHoraLocal = () => {
    const d = new Date();
    const dois = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())} ` +
           `${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
  };

  const registrar = (tipo, extra) => {
    const registro = Object.assign({
      id: idCurto(),
      dataHora: dataHoraLocal(),
      visitante: idVisitante(),
      tipo,
      tela: telaAtual,
      filtro: filtroAtual,
      avaliacao: '',
      comentario: '',
      detalhe: '',
      enviado: false
    }, extra);

    const lista = lerLS(CHAVE_REGISTROS, []);
    lista.push(registro);
    if (lista.length > MAX_REGISTROS) lista.splice(0, lista.length - MAX_REGISTROS);
    gravarLS(CHAVE_REGISTROS, lista);

    enviarPendentes();
  };

  const enviarLote = lote => {
    const limpos = lote.map(r => {
      const copia = {};
      CAMPOS.forEach(c => { copia[c] = r[c]; });
      return copia;
    });

    if (CONFIG.enviarPara === 'googleSheets' && CONFIG.urlGoogleSheets) {
      return fetch(CONFIG.urlGoogleSheets, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(limpos)
      });
    }

    if (CONFIG.enviarPara === 'firebase' && CONFIG.urlFirebase) {
      const corpo = {};
      limpos.forEach(r => { corpo[r.id] = r; });
      return fetch(CONFIG.urlFirebase.replace(/\/$/, '') + '/registros.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      }).then(res => {
        if (!res.ok) throw new Error('Firebase recusou o envio');
      });
    }

    return Promise.reject(new Error('Destino não configurado'));
  };

  // Envia o que ainda não foi enviado. Se a internet cair, tenta de novo no próximo registro.
  const enviarPendentes = () => {
    if (CONFIG.enviarPara === 'localStorage' || enviando) return;
    if (navigator.onLine === false) return;

    const lote = lerLS(CHAVE_REGISTROS, []).filter(r => !r.enviado).slice(0, 50);
    if (!lote.length) return;

    enviando = true;
    enviarLote(lote)
      .then(() => {
        const ids = lote.map(r => r.id);
        const todos = lerLS(CHAVE_REGISTROS, []);
        todos.forEach(r => { if (ids.includes(r.id)) r.enviado = true; });
        gravarLS(CHAVE_REGISTROS, todos);
        enviando = false;
        if (todos.some(r => !r.enviado)) enviarPendentes();
      })
      .catch(() => { enviando = false; });
  };

  // No console do navegador: exportarRegistrosCSV()
  window.exportarRegistrosCSV = () => {
    const celula = valor => {
      let texto = String(valor == null ? '' : valor);
      if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replace(/"/g, '""') + '"';
    };
    const linhas = [CAMPOS.join(',')];
    lerLS(CHAVE_REGISTROS, []).forEach(r => {
      linhas.push(CAMPOS.map(c => celula(r[c])).join(','));
    });
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'registros-de-uso.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // navegação

  const mostrarTela = (nome, inicial) => {
    telaAtual = nome;
    $$('.tela').forEach(t => { t.hidden = t.id !== 'tela-' + nome; });
    document.title = TELAS[nome] + ' – Rocinha';

    const naInicio = nome === 'inicio';
    definirDesativado(btnVoltar, naInicio);
    definirDesativado(btnInicio, naInicio);

    if (nome === 'lista') desenharLista();
    if (nome === 'mapa') prepararMapa();
    if (inicial) return;

    window.scrollTo(0, 0);
    const titulo = $('#tela-' + nome + ' [data-titulo]');
    if (titulo) titulo.focus({ preventScroll: true });
    registrar('tela');
  };

  const irPara = nome => {
    if (!telaValida(nome)) return;
    const estado = window.history.state;
    const indice = estado && typeof estado.indice === 'number' ? estado.indice + 1 : 1;
    try { window.history.pushState({ tela: nome, indice }, '', '#' + nome); } catch (e) { /* sem histórico */ }
    mostrarTela(nome);
  };

  const voltar = () => {
    if (telaAtual === 'inicio') return;
    const estado = window.history.state;
    if (estado && typeof estado.indice === 'number' && estado.indice > 0) {
      window.history.back();
      return;
    }
    try { window.history.replaceState({ tela: 'inicio', indice: 0 }, '', '#inicio'); } catch (e) { /* sem histórico */ }
    mostrarTela('inicio');
  };

  window.addEventListener('popstate', ev => {
    let nome = ev.state && ev.state.tela;
    if (!telaValida(nome)) nome = window.location.hash.replace('#', '');
    mostrarTela(telaValida(nome) ? nome : 'inicio');
  });

  // tamanho da letra

  const aplicarLetra = anunciar => {
    document.documentElement.style.fontSize = NIVEIS_LETRA[nivelLetra] + 'px';
    definirDesativado(btnMenos, nivelLetra === 0);
    definirDesativado(btnMais, nivelLetra === NIVEIS_LETRA.length - 1);
    gravarLS(CHAVE_LETRA, nivelLetra);
    if (anunciar) {
      $('#anuncio').textContent = `Letra tamanho ${nivelLetra + 1} de ${NIVEIS_LETRA.length}.`;
      registrar('acao', { detalhe: 'letra:' + NIVEIS_LETRA[nivelLetra] + 'px' });
    }
  };

  const mudarLetra = passo => {
    const novo = nivelLetra + passo;
    if (novo < 0 || novo >= NIVEIS_LETRA.length) return;
    nivelLetra = novo;
    aplicarLetra(true);
  };

  // filtro por material

  const todosOsPontos = () => (typeof PONTOS !== 'undefined' ? PONTOS : []);

  const pontosFiltrados = () => todosOsPontos().filter(p =>
    filtroAtual === 'todos' || (p.materiais || []).includes(filtroAtual)
  );

  const achar = id => todosOsPontos().find(p => String(p.id) === String(id));

  const montarFiltros = () => {
    const itens = Object.keys(MATERIAIS)
      .map(id => ({ id, nome: MATERIAIS[id].nome, emoji: MATERIAIS[id].emoji }))
      .concat([{ id: 'todos', nome: 'Todos', emoji: '♻️' }]);

    $$('[data-filtro]').forEach(caixa => {
      caixa.textContent = '';
      itens.forEach(item => {
        caixa.appendChild(el('button', {
          type: 'button',
          class: 'btn',
          'data-filtro-id': item.id,
          'aria-pressed': item.id === filtroAtual ? 'true' : 'false'
        }, [
          el('span', { 'aria-hidden': 'true', texto: item.emoji }),
          el('span', { texto: item.nome })
        ]));
      });
    });
  };

  const atualizarResultados = () => {
    const n = pontosFiltrados().length;
    const texto = n === 0 ? 'Nenhum lugar encontrado para este material.'
      : n === 1 ? 'Mostrando 1 lugar.'
      : `Mostrando ${n} lugares.`;
    $$('[data-resultado]').forEach(p => { p.textContent = texto; });

    if (telaAtual === 'lista') desenharLista();
    if (telaAtual === 'mapa' && mapa) desenharMarcadores();
  };

  const definirFiltro = id => {
    filtroAtual = id;
    $$('[data-filtro-id]').forEach(b => {
      b.setAttribute('aria-pressed', b.getAttribute('data-filtro-id') === id ? 'true' : 'false');
    });
    registrar('filtro', { detalhe: id });
    atualizarResultados();
  };

  // cartões e lista

  const urlComoChegar = p => {
    const usaCoordenadas = CONFIG.comoChegarUsa === 'coordenadas' &&
      typeof p.lat === 'number' && typeof p.lng === 'number';
    const destino = usaCoordenadas ? `${p.lat},${p.lng}` : p.endereco;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destino);
  };

  const nomesDosMateriais = p =>
    (p.materiais || []).map(m => (MATERIAIS[m] ? MATERIAIS[m].nome : m));

  const urlWhatsApp = p => {
    const texto = [
      'Ponto de descarte de lixo eletrônico',
      p.nome,
      'Endereço: ' + p.endereco,
      'Horário: ' + p.horario,
      'Aceita: ' + nomesDosMateriais(p).join(', '),
      'Como chegar: ' + urlComoChegar(p)
    ].join('\n');
    return 'https://wa.me/?text=' + encodeURIComponent(texto);
  };

  const linhaDeDado = (emoji, rotulo, conteudo) => el('li', {}, [
    el('span', { 'aria-hidden': 'true', texto: emoji }),
    el('span', {}, [el('strong', { texto: rotulo + ': ' }), conteudo])
  ]);

  const criarCartao = p => {
    const dados = el('ul', { class: 'dados' }, [
      linhaDeDado('📍', 'Endereço', p.endereco),
      linhaDeDado('🕒', 'Horário', p.horario)
    ]);
    if (p.telefone) {
      const digitos = String(p.telefone).replace(/[^\d+]/g, '');
      dados.appendChild(linhaDeDado('📞', 'Telefone', el('a', { href: 'tel:' + digitos, texto: p.telefone })));
    }

    const etiquetas = el('ul', { class: 'etiquetas' }, (p.materiais || []).map(m => {
      const info = MATERIAIS[m] || { nome: m, emoji: '♻️' };
      return el('li', { class: 'etiqueta' }, [el('span', { 'aria-hidden': 'true', texto: info.emoji + ' ' }), info.nome]);
    }));

    const comoChegar = el('a', {
      class: 'btn btn--azul',
      href: urlComoChegar(p),
      target: '_blank',
      rel: 'noopener',
      'data-acao': 'como_chegar',
      'data-ponto': p.id,
      'aria-label': `Como chegar: ${p.nome} (abre o Google Maps)`
    }, [el('span', { 'aria-hidden': 'true', texto: '🧭' }), 'Como chegar']);

    const whatsapp = el('a', {
      class: 'btn btn--claro',
      href: urlWhatsApp(p),
      target: '_blank',
      rel: 'noopener',
      'data-acao': 'whatsapp',
      'data-ponto': p.id,
      'aria-label': 'Compartilhar no WhatsApp: ' + p.nome
    }, [el('span', { 'aria-hidden': 'true', texto: '💬' }), 'Compartilhar no WhatsApp']);

    return el('article', { class: 'cartao' }, [
      el('h3', { texto: p.nome }),
      dados,
      el('p', { class: 'rotulo', texto: 'Aceita estes materiais:' }),
      etiquetas,
      el('div', { class: 'botoes' }, [comoChegar, whatsapp])
    ]);
  };

  const desenharLista = () => {
    const caixa = $('#lista-cartoes');
    caixa.textContent = '';
    const pontos = pontosFiltrados();

    if (!pontos.length) {
      caixa.appendChild(el('div', { class: 'aviso' }, [
        el('p', { texto: 'Nenhum lugar aceita este material por enquanto.' }),
        el('button', { type: 'button', class: 'btn btn--bloco', 'data-filtro-id': 'todos', texto: 'Ver todos os lugares' })
      ]));
      return;
    }
    pontos.forEach(p => caixa.appendChild(criarCartao(p)));
  };

  // mapa

  // O Leaflet só é baixado quando a pessoa abre o mapa. Se a internet falhar, o resto do site continua funcionando.
  const carregarLeaflet = () => {
    if (window.L) return Promise.resolve();
    if (promessaLeaflet) return promessaLeaflet;

    promessaLeaflet = new Promise((ok, erro) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = CONFIG.leafletCss;
      document.head.appendChild(css);

      const js = document.createElement('script');
      js.src = CONFIG.leafletJs;

      const falhar = () => {
        clearTimeout(limite);
        if (js.parentNode) js.parentNode.removeChild(js);
        if (css.parentNode) css.parentNode.removeChild(css);
        erro(new Error('Leaflet não carregou'));
      };
      const limite = setTimeout(falhar, 20000);

      js.onload = () => { clearTimeout(limite); ok(); };
      js.onerror = falhar;
      document.head.appendChild(js);
    });

    promessaLeaflet.catch(() => { promessaLeaflet = null; });
    return promessaLeaflet;
  };

  const mostrarEstadoDoMapa = (texto, comBotoes) => {
    $('#mapa-estado').hidden = !texto;
    $('#mapa-estado-texto').textContent = texto || '';
    $('#mapa-estado-botoes').hidden = !comBotoes;
  };

  const prepararMapa = () => {
    if (mapa) {
      mapa.invalidateSize();
      desenharMarcadores();
      return;
    }
    mostrarEstadoDoMapa('Carregando o mapa…', false);
    carregarLeaflet().then(criarMapa).catch(() => {
      mostrarEstadoDoMapa('O mapa não abriu. A internet pode estar fraca. Você pode tentar de novo ou ver a lista de lugares.', true);
    });
  };

  const criarMapa = () => {
    if (mapa) return;
    mostrarEstadoDoMapa('', false);

    mapa = L.map('mapa', { center: CONFIG.centroMapa, zoom: CONFIG.zoomMapa, zoomControl: false });
    L.control.zoom({ zoomInTitle: 'Aproximar o mapa', zoomOutTitle: 'Afastar o mapa' }).addTo(mapa);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores do OpenStreetMap</a>'
    }).addTo(mapa);

    camada = L.layerGroup().addTo(mapa);

    if (telaAtual === 'mapa') {
      mapa.invalidateSize();
      desenharMarcadores();
    }
  };

  const desenharMarcadores = () => {
    if (!mapa) return;
    camada.clearLayers();
    marcadores = {};

    const pontos = pontosFiltrados().filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');

    pontos.forEach(p => {
      const icone = L.divIcon({
        className: 'marcador',
        html: '<span class="marcador__bolha" aria-hidden="true">♻️</span>',
        iconSize: [52, 52],
        iconAnchor: [26, 26]
      });
      const marcador = L.marker([p.lat, p.lng], { icon: icone, title: p.nome, keyboard: true });
      marcador.on('click', () => selecionarPonto(p.id));
      marcador.addTo(camada);
      marcadores[p.id] = marcador;

      const elemento = marcador.getElement();
      if (elemento) {
        elemento.setAttribute('role', 'button');
        elemento.setAttribute('aria-label', `Lugar de descarte: ${p.nome}. Toque para ver os dados.`);
      }
    });

    if (pontos.length) {
      mapa.fitBounds(L.latLngBounds(pontos.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 17 });
    } else {
      mapa.setView(CONFIG.centroMapa, CONFIG.zoomMapa);
    }

    if (pontoSelecionado && marcadores[pontoSelecionado]) {
      marcarSelecionado(pontoSelecionado);
    } else {
      pontoSelecionado = null;
      limparDetalhe();
    }
  };

  const marcarSelecionado = id => {
    Object.keys(marcadores).forEach(k => {
      const elemento = marcadores[k].getElement();
      if (elemento) elemento.classList.toggle('selecionado', String(k) === String(id));
    });
  };

  const limparDetalhe = () => {
    const caixa = $('#detalhe-mapa');
    caixa.textContent = '';
    caixa.appendChild(el('p', { texto: 'Toque em um marcador para ver os dados do lugar.' }));
  };

  const selecionarPonto = id => {
    const p = achar(id);
    if (!p) return;
    pontoSelecionado = p.id;
    marcarSelecionado(p.id);

    const caixa = $('#detalhe-mapa');
    caixa.textContent = '';
    const cartao = criarCartao(p);
    cartao.appendChild(el('button', {
      type: 'button',
      class: 'btn btn--claro btn--bloco',
      'data-acao': 'subir-mapa'
    }, [el('span', { 'aria-hidden': 'true', texto: '↑' }), 'Voltar ao mapa']));
    caixa.appendChild(cartao);

    registrar('acao', { detalhe: 'marcador:' + p.id });

    caixa.scrollIntoView();
    const titulo = $('h3', caixa);
    titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: true });
  };

  // feedback

  const painelFeedback = $('#feedback-painel');
  const abrirFeedback = $('#feedback-abrir');
  const formFeedback = $('#form-feedback');
  const msgFeedback = $('#feedback-msg');

  const abrirPainelFeedback = () => {
    painelFeedback.hidden = false;
    abrirFeedback.setAttribute('aria-expanded', 'true');
    msgFeedback.textContent = '';
    msgFeedback.className = 'msg';
    $('input[name="avaliacao"]', formFeedback).focus();
  };

  const fecharPainelFeedback = () => {
    painelFeedback.hidden = true;
    abrirFeedback.setAttribute('aria-expanded', 'false');
    abrirFeedback.focus();
  };

  const ligarFeedback = () => {
    abrirFeedback.addEventListener('click', () => {
      if (painelFeedback.hidden) abrirPainelFeedback();
      else fecharPainelFeedback();
    });

    $('#feedback-fechar').addEventListener('click', fecharPainelFeedback);

    painelFeedback.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' || ev.key === 'Esc') fecharPainelFeedback();
    });

    formFeedback.addEventListener('submit', ev => {
      ev.preventDefault();
      const marcada = $('input[name="avaliacao"]:checked', formFeedback);

      if (!marcada) {
        msgFeedback.textContent = 'Escolha uma opção: Gostei, Mais ou menos ou Tive dificuldade.';
        msgFeedback.className = 'msg msg--erro';
        $('input[name="avaliacao"]', formFeedback).focus();
        return;
      }

      const nomePessoa = $('#nome-feedback').value.trim().slice(0, 40);

      registrar('avaliacao', {
        avaliacao: marcada.value,
        comentario: $('#comentario').value.trim(),
        detalhe: nomePessoa ? 'nome:' + nomePessoa : ''
      });

      formFeedback.reset();
      msgFeedback.textContent = 'Obrigado! Recebemos a sua resposta.';
      msgFeedback.className = 'msg msg--ok';
    });
  };

  // início

  const ligarEventos = () => {
    btnVoltar.addEventListener('click', () => { if (!estaDesativado(btnVoltar)) voltar(); });
    btnInicio.addEventListener('click', () => { if (!estaDesativado(btnInicio)) irPara('inicio'); });
    btnMenos.addEventListener('click', () => mudarLetra(-1));
    btnMais.addEventListener('click', () => mudarLetra(1));

    $('#pular').addEventListener('click', ev => {
      ev.preventDefault();
      $('#conteudo').focus();
    });

    $('#mapa-tentar').addEventListener('click', prepararMapa);

    document.addEventListener('click', ev => {
      const alvo = ev.target.closest('[data-ir],[data-filtro-id],[data-material],[data-acao]');
      if (!alvo) return;

      if (alvo.hasAttribute('data-ir')) {
        irPara(alvo.getAttribute('data-ir'));
      } else if (alvo.hasAttribute('data-filtro-id')) {
        definirFiltro(alvo.getAttribute('data-filtro-id'));
      } else if (alvo.hasAttribute('data-material')) {
        definirFiltro(alvo.getAttribute('data-material'));
        irPara('lista');
      } else {
        const acao = alvo.getAttribute('data-acao');
        if (acao === 'subir-mapa') {
          const mapaEl = $('#mapa');
          mapaEl.scrollIntoView();
          mapaEl.focus();
        } else {
          registrar('acao', { detalhe: acao + ':' + alvo.getAttribute('data-ponto') });
        }
      }
    });

    window.addEventListener('online', enviarPendentes);
    ligarFeedback();
  };

  const iniciar = () => {
    const salvo = lerLS(CHAVE_LETRA, 0);
    nivelLetra = Number.isInteger(salvo) && salvo >= 0 && salvo < NIVEIS_LETRA.length ? salvo : 0;
    aplicarLetra(false);

    montarFiltros();
    atualizarResultados();
    ligarEventos();

    const hash = window.location.hash.replace('#', '');
    const inicial = telaValida(hash) ? hash : 'inicio';
    try { window.history.replaceState({ tela: inicial, indice: 0 }, '', '#' + inicial); } catch (e) { /* sem histórico */ }

    telaAtual = inicial;
    registrar('acesso');
    mostrarTela(inicial, true);
  };

  iniciar();
})();
