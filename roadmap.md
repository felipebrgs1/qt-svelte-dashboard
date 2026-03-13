# Roadmap — PDF Reader com Tradução

**Stack:** Qt 6 · C++ · Qt WebEngine · Svelte 5 · TypeScript · Tailwind 4 · shadcn-svelte  
**Arquitetura:** Qt WebEngine (Chromium embutido) renderiza o frontend Svelte. C++ expõe uma bridge via `QWebChannel` para o JavaScript. Toda I/O de arquivo, PDF parsing e chamadas de tradução passam pelo lado C++.

---

## Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────┐
│                  Qt Application (C++)                │
│                                                     │
│  ┌──────────────┐    QWebChannel     ┌────────────┐ │
│  │  PDF Engine  │◄──────────────────►│ WebEngine  │ │
│  │  (QPdfDocument│    bridge JS/C++  │  (Chromium)│ │
│  │  + pdf.js)   │                   │            │ │
│  └──────────────┘                   │  Svelte 5  │ │
│                                     │  Tailwind 4│ │
│  ┌──────────────┐                   │  shadcn    │ │
│  │  Translation │◄──────────────────│            │ │
│  │  (LibreTransl│                   └────────────┘ │
│  │  ou DeepL)   │                                  │
│  └──────────────┘                                  │
└─────────────────────────────────────────────────────┘
```

**Nota sobre Qt WebEngine vs pdf.js:**  
O Qt 6 tem `QPdfDocument` nativo, mas renderizar via pdf.js no WebEngine dá mais controle sobre o text layer (necessário para capturar seleção de texto). A abordagem recomendada é: C++ lê o arquivo e passa os bytes via `QWebChannel` → pdf.js renderiza no webview.

---

## Fase 0 — Fundação do projeto `Dia 1–2`

### Objetivos
- [x] Estrutura base do projeto funcionando com Qt WebEngine abrindo o frontend Svelte.

### Tarefas

**0.1 Scaffold do projeto Qt**
- [x] Criar projeto Qt 6 com CMake
- [x] Adicionar módulos: `Qt6::WebEngineWidgets`, `Qt6::WebChannel`, `Qt6::Pdf`
- [x] Configurar `QWebEngineView` como janela principal
- [x] Testar carregamento de uma página HTML local

```cmake
find_package(Qt6 REQUIRED COMPONENTS WebEngineWidgets WebChannel Pdf)
target_link_libraries(app Qt6::WebEngineWidgets Qt6::WebChannel Qt6::Pdf)
```

**0.2 Scaffold do frontend Svelte**
- [x] `npm create svelte@latest frontend` com TypeScript
- [x] Instalar Tailwind 4 (sem config JS, só CSS nativo)
- [x] Instalar shadcn-svelte: `npx shadcn-svelte@latest init`
- [x] Configurar build para gerar em `dist/` que o Qt vai servir

**0.3 Integração Qt + Svelte via QWebChannel**
- [x] No C++: instanciar `QWebChannel` e registrar o objeto bridge
- [x] No Svelte: carregar `qwebchannel.js` (incluso no Qt) e conectar ao `qt.webChannelTransport`
- [x] Testar round-trip: botão no Svelte → chama C++ → retorna string → exibe no Svelte

```cpp
// main.cpp
QWebChannel *channel = new QWebChannel(this);
channel->registerObject("bridge", new PdfBridge(this));
view->page()->setWebChannel(channel);
```

```typescript
// bridge.ts (Svelte)
const channel = await new Promise<QWebChannel>(resolve => {
  new QWebChannel(qt.webChannelTransport, resolve);
});
export const bridge = channel.objects.bridge;
```

**0.4 Definir interface da bridge**
- [x] Criar `PdfBridge` (QObject) com os slots que o JS vai chamar:
  - `openFileDialog()` → retorna path do arquivo
  - `loadPdf(path: string)` → retorna ArrayBuffer base64
  - `translate(text: string, targetLang: string)` → retorna tradução
- [x] Criar os signals Qt que notificam o JS:
  - `pdfLoaded(base64: string, pageCount: int)`
  - `translationReady(original: string, translated: string)`

**0.5 Hot reload no desenvolvimento**
- [x] Em dev: Qt aponta o WebEngine para `http://localhost:5173` (Vite dev server)
- [x] Em prod: Qt serve os arquivos estáticos de `dist/` via `QWebEngineUrlScheme`
- [x] Flag de build `#ifdef QT_DEBUG` para alternar

---

## Fase 1 — Renderização de PDF `Dia 3–7`

### Objetivos
- [x] Abrir e renderizar PDFs com navegação funcional.

### Tarefas

**1.1 Abertura de arquivo (C++)**
- [x] `QFileDialog::getOpenFileName()` filtrado para `*.pdf`
- [x] Ler o arquivo com `QFile` e converter para base64
- [x] Emitir o signal `pdfLoaded` para o webview

**1.2 Renderização com pdf.js (Svelte)**
- [x] Importar pdf.js via CDN ou bundle local
- [x] Receber o ArrayBuffer base64 via bridge e decodificar
- [x] Renderizar página em `<canvas>` com `PDFPageProxy.render()`
- [x] Separar canvas de renderização do text layer (`<div class="textLayer">`)

```typescript
// PdfViewer.svelte
const pdfDoc = await pdfjsLib.getDocument({ data: atob(base64) }).promise;
const page = await pdfDoc.getPage(currentPage);
const viewport = page.getViewport({ scale });
await page.render({ canvasContext: ctx, viewport }).promise;
await page.getTextContent().then(content => {
  pdfjsLib.renderTextLayer({ textContent: content, container: textLayer, viewport });
});
```

**1.3 Navegação entre páginas**
- [x] Componente `PageNav.svelte` com shadcn Button e Input
- [x] Estado reativo: `currentPage`, `totalPages`, `isLoading`
- [ ] Atalhos: `←` / `→` para prev/next, `Ctrl+G` para ir para página específica

**1.4 Zoom**
- [x] Presets via shadcn Select: 50%, 75%, 100%, 125%, 150%, Ajustar largura
- [ ] Fit-to-width: calcular scale baseado em `containerWidth / page.getViewport({scale:1}).width`
- [ ] Persistir preferência de zoom no `localStorage`

**1.5 Scroll contínuo entre páginas**
- [ ] Renderizar páginas em sequência num container com scroll vertical
- [ ] `IntersectionObserver` para detectar qual página está visível e atualizar o indicador
- [ ] Lazy render: só renderizar páginas próximas da viewport (±2 páginas)

---

## Fase 2 — Seleção de texto e Tradução `Dia 8–13`

### Objetivos
Selecionar texto no PDF e ver a tradução em um dropdown/popover contextual.

### Tarefas

**2.1 Capturar seleção de texto**
- O text layer do pdf.js expõe spans com o texto posicionado sobre o canvas
- Capturar evento `mouseup` no documento
- Verificar `window.getSelection().toString().trim()` — se não vazio, prosseguir
- Calcular posição do popover com `getBoundingClientRect()` da seleção

```typescript
// selection.ts
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (text && text.length > 1) {
    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    showTranslationPopover(text, rect);
  }
});
```

**2.2 Translation Popover (Svelte + shadcn)**
- Usar shadcn `Popover` ancorado na posição do mouse
- Estados: `idle` → `loading` → `translated` → `error`
- Skeleton durante o loading (shadcn Skeleton)
- Botão de copiar tradução para clipboard

**2.3 Bridge de tradução (C++)**
- Slot `translate(text, targetLang)` no `PdfBridge`
- Fazer request HTTP com `QNetworkAccessManager` para a API de tradução
- Emitir signal `translationReady(original, translated)` quando concluir
- Timeout de 8 segundos com mensagem de erro tratada

```cpp
// PdfBridge.cpp
void PdfBridge::translate(const QString &text, const QString &targetLang) {
    QNetworkRequest req(QUrl("http://localhost:5000/translate")); // LibreTranslate
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    QJsonObject body{{"q", text}, {"source", "auto"}, {"target", targetLang}};
    m_network->post(req, QJsonDocument(body).toJson());
}
```

**2.4 Detecção automática de idioma**
- Usar endpoint `/detect` do LibreTranslate antes de traduzir
- Exibir idioma detectado no popover (ex: "Japonês → Português")
- Cache simples: não re-detectar idioma se o mesmo texto já foi processado

**2.5 Seletor de idioma destino**
- Dropdown no toolbar com idiomas principais: PT-BR, EN, ES, FR, DE, JA, ZH, KO
- Persistir preferência via `QSettings` (C++) ou `localStorage` (Svelte)
- Sincronizar entre bridge e frontend via signal

**2.6 Debounce e UX**
- Debounce de 300ms após `mouseup` para não disparar em seleções parciais
- Fechar popover ao clicar fora ou pressionar `Escape`
- Não mostrar popover para seleções menores que 2 caracteres

---

## Fase 3 — Toolbar e ferramentas `Dia 14–17`

### Objetivos
Interface completa com todas as ferramentas básicas de leitura.

### Tarefas

**3.1 Toolbar principal**
- Componente `Toolbar.svelte` com shadcn components
- Seções: abrir arquivo | navegação + página | zoom | busca | modo escuro
- Menu nativo Qt via `QMenuBar` para File, View, Help

**3.2 Sidebar com miniaturas**
- Renderizar thumbnails em escala 0.15x via pdf.js
- `ScrollArea` do shadcn com lista de thumbnails clicáveis
- Highlight da página atual, scroll automático para manter a thumb visível
- Painel colapsável com `ResizeObserver`

**3.3 Busca no texto (`Ctrl+F`)**
- pdf.js expõe `PDFFindController` — usar para highlight dos resultados
- UI: input shadcn com contador "3 de 12", botões prev/next match
- Highlight com CSS no text layer

**3.4 Modo escuro**
- Tailwind 4 dark mode via `prefers-color-scheme` ou classe manual
- Toggle no toolbar persiste preferência
- Inverter cores do canvas do PDF em modo escuro via CSS `filter: invert(1) hue-rotate(180deg)` (opcional)

**3.5 Atalhos de teclado globais**
- Registrar via Qt `QShortcut` para garantir que funcionam mesmo com foco no webview:
  - `Ctrl+O` — abrir arquivo
  - `Ctrl+F` — busca
  - `Ctrl++` / `Ctrl+-` — zoom in/out
  - `←` / `→` — página anterior/próxima
  - `F11` — tela cheia

**3.6 Histórico de arquivos recentes**
- Salvar últimos 10 arquivos via `QSettings`
- Exibir em `File > Abrir recente` no menu nativo Qt
- Também exibir na tela de boas-vindas quando nenhum PDF está aberto

---

## Fase 4 — Empacotamento e distribuição `Dia 18–21`

### Objetivos
Build multiplataforma funcional e LibreTranslate configurada.

### Tarefas

**4.1 LibreTranslate — decisão de deploy**

| Opção | Prós | Contras |
|---|---|---|
| Self-hosted (Docker) | Privacidade total, sem custo por uso | Usuário precisa rodar Docker |
| Bundled como processo Qt | Experiência seamless | +500MB no bundle |
| API pública (libretranslate.com) | Zero configuração | Limite de requests, requer internet |
| DeepL API (freemium) | Melhor qualidade | Custo em volume, requer cadastro |

Recomendação para v1: API pública com fallback para instância local se detectada.

**4.2 Deploy do LibreTranslate (self-hosted)**
```bash
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate \
  --load-only pt,en,es,fr,de,ja,zh,ko
```
- C++ verifica se `localhost:5000` está disponível ao iniciar
- Se não, exibir dialog sugerindo instalar o Docker + comando

**4.3 Build multiplataforma com CMake**
- Linux: gerar `.deb` e `.AppImage` via `linuxdeployqt`
- Windows: `windeployqt` para copiar DLLs do Qt, gerar installer com NSIS ou Inno Setup
- macOS: `macdeployqt` para gerar `.dmg` com bundle correto

```bash
# Linux AppImage
cmake --build . --config Release
linuxdeployqt pdf-reader -appimage -qmldir=frontend/dist
```

**4.4 Empacotar frontend no binário**
- Usar `Qt Resource System` (`.qrc`) para embutir `dist/` no executável
- Zero dependência de arquivos externos em produção
- Em debug: continuar apontando para `localhost:5173`

```cmake
qt_add_resources(app "frontend"
    PREFIX "/"
    FILES frontend/dist/index.html frontend/dist/assets/...)
```

**4.5 CI/CD básico (GitHub Actions)**
```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: jurplel/install-qt-action@v3
        with: { version: '6.7.0', modules: 'qtwebengine' }
      - run: cmake -B build && cmake --build build --config Release
```

---

## Referências e recursos

- [Qt WebEngine — QWebChannel docs](https://doc.qt.io/qt-6/qtwebchannel-index.html)
- [pdf.js — Text Layer rendering](https://mozilla.github.io/pdf.js/examples/)
- [shadcn-svelte — componentes](https://www.shadcn-svelte.com/)
- [LibreTranslate — API docs](https://libretranslate.com/docs/)
- [Tailwind 4 — guia de migração](https://tailwindcss.com/docs/v4-beta)
- [Qt CMake deployment](https://doc.qt.io/qt-6/cmake-deployment.html)

---

*Gerado em março de 2026*