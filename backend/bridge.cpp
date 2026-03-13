#include "bridge.h"

PdfBridge::PdfBridge(QWidget *parentWidget, QObject *parent)
    : QObject(parent), m_parentWidget(parentWidget) {
  m_network = new QNetworkAccessManager(this);
  qDebug() << "[Bridge] PdfBridge created, parentWidget:" << m_parentWidget;
}

QString PdfBridge::openFileDialog() {
  qDebug() << "[Bridge] openFileDialog() called";

  QString path = QFileDialog::getOpenFileName(m_parentWidget, "Open PDF",
                                              QString(), "PDF Files (*.pdf)");

  if (path.isEmpty()) {
    qDebug()
        << "[Bridge] openFileDialog() — user cancelled or no file selected";
  } else {
    qDebug() << "[Bridge] openFileDialog() — selected path:" << path;
  }

  return path;
}

void PdfBridge::loadPdf(const QString &path) {
  qDebug() << "[Bridge] loadPdf() called with path:" << path;

  if (path.isEmpty()) {
    qDebug() << "[Bridge] loadPdf() — empty path, aborting";
    emit errorOccurred("Path is empty.");
    return;
  }

  if (!QFile::exists(path)) {
    qDebug() << "[Bridge] loadPdf() — file does not exist:" << path;
    emit errorOccurred("File does not exist: " + path);
    return;
  }

  // Build the custom URL: pdfreader:///absolute/path/to/file.pdf
  // The PdfSchemeHandler will serve the raw bytes directly to the renderer,
  // with zero base64 encoding and zero QWebChannel data transfer.
  // Path already starts with '/', so "pdfreader://" + path yields the
  // correct triple-slash form: pdfreader:///home/user/file.pdf
  const QString url = "pdfreader://" + path;

  qDebug() << "[Bridge] loadPdf() — emitting pdfLoaded with URL:" << url;
  emit pdfLoaded(url, 0);
  qDebug() << "[Bridge] loadPdf() — pdfLoaded signal emitted";
}

void PdfBridge::translate(const QString &text, const QString &targetLang) {
  qDebug() << "[Bridge] translate() called — target:" << targetLang
           << "text length:" << text.length();

  // Placeholder: mock translation for Phase 0.3 round-trip testing.
  // Phase 2 will replace this with a real LibreTranslate HTTP call.
  emit translationReady(text, "[Translated: " + text + "]");
  qDebug() << "[Bridge] translate() — translationReady emitted";
}
