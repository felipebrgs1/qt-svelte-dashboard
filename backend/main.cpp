#include "bridge.h"
#include "pdfscheme.h"
#include <QApplication>
#include <QDir>
#include <QProcessEnvironment>
#include <QUrl>
#include <QWebChannel>
#include <QWebEnginePage>
#include <QWebEngineProfile>
#include <QWebEngineUrlScheme>
#include <QWebEngineView>

class CustomWebPage : public QWebEnginePage {
public:
  explicit CustomWebPage(QObject *parent = nullptr) : QWebEnginePage(parent) {}

protected:
  void javaScriptConsoleMessage(JavaScriptConsoleMessageLevel level,
                                const QString &message, int lineNumber,
                                const QString &sourceID) override {
    QString levelStr;
    switch (level) {
    case InfoMessageLevel:
      levelStr = "Info";
      break;
    case WarningMessageLevel:
      levelStr = "Warning";
      break;
    case ErrorMessageLevel:
      levelStr = "Error";
      break;
    }
    qDebug().noquote() << QString("[JS %1] %2:%3 %4")
                              .arg(levelStr)
                              .arg(sourceID)
                              .arg(lineNumber)
                              .arg(message);
  }
};

// Must be called before QApplication is constructed.
static void registerPdfScheme() {
  QWebEngineUrlScheme scheme("pdfreader");

  // Host syntax allows URLs like pdfreader:///absolute/path/file.pdf
  // (empty host, absolute path — mirrors how file:/// works).
  scheme.setSyntax(QWebEngineUrlScheme::Syntax::Host);

  scheme.setFlags(
      // Treated as a secure origin (avoids mixed-content warnings).
      QWebEngineUrlScheme::Flag::SecureScheme |
      QWebEngineUrlScheme::Flag::LocalAccessAllowed |
      // Allows cross-origin fetch() from the Vite dev-server origin
      // (http://localhost:5173) so pdf.js can load the URL normally.
      QWebEngineUrlScheme::Flag::CorsEnabled |
      // Explicitly permit the Fetch API — required in Qt 6.6+.
      QWebEngineUrlScheme::Flag::FetchApiAllowed);

  QWebEngineUrlScheme::registerScheme(scheme);
}

int main(int argc, char *argv[]) {
  // ── Scheme registration (before QApplication) ────────────────────────────
  registerPdfScheme();

  QApplication app(argc, argv);

  QWebEngineView view;
  CustomWebPage *page = new CustomWebPage(&view);
  view.setPage(page);

  // ── Install custom URL scheme handler ────────────────────────────────────
  // The handler is parented to the profile so it lives as long as the profile.
  auto *pdfHandler = new PdfSchemeHandler(view.page()->profile());
  view.page()->profile()->installUrlSchemeHandler("pdfreader", pdfHandler);

  // ── Setup QWebChannel ────────────────────────────────────────────────────
  QWebChannel *channel = new QWebChannel(&view);
  // Pass &view as the parent widget so QFileDialog is properly parented to
  // the main window — critical on Wayland where a nullptr parent causes the
  // dialog to appear behind the window or not receive focus.
  PdfBridge *bridge = new PdfBridge(&view, &view);
  channel->registerObject("bridge", bridge);
  view.page()->setWebChannel(channel);

  // ── Load frontend ─────────────────────────────────────────────────────────
  QString devUrl =
      QProcessEnvironment::systemEnvironment().value("DASHBOARD_DEV_URL");
  if (!devUrl.isEmpty()) {
    qDebug() << "[dev] Loading frontend from" << devUrl;
    view.load(QUrl(devUrl));
  } else {
    // Try to load from embedded resources first (Production/AUR)
    // Fallback to local file if resources are empty (local build)
    QUrl qrcUrl("qrc:/index.html");
    QFile resFile(":/index.html");
    if (resFile.exists()) {
      qDebug() << "[prod] Loading frontend from embedded resources (qrc)";
      view.load(qrcUrl);
    } else {
      QString frontendPath = QDir(QCoreApplication::applicationDirPath())
                                 .filePath("frontend/index.html");
      qDebug() << "[prod] Loading frontend from local file:" << frontendPath;
      view.load(QUrl::fromLocalFile(frontendPath));
    }
  }

  view.setWindowTitle("PDF Reader with Translation");
  view.resize(1280, 720);
  view.show();

  return app.exec();
}
