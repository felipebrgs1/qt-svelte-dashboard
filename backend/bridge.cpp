#include "bridge.h"

PdfBridge::PdfBridge(QObject *parent) : QObject(parent) {
    m_network = new QNetworkAccessManager(this);
}

QString PdfBridge::openFileDialog() {
    QString path = QFileDialog::getOpenFileName(nullptr, "Open PDF", "", "PDF Files (*.pdf)");
    return path;
}

void PdfBridge::loadPdf(const QString &path) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly)) {
        emit errorOccurred("Could not open file: " + path);
        return;
    }

    QByteArray data = file.readAll();
    QString base64 = data.toBase64();
    
    // For now, pageCount is unknown here, we'll let pdf.js handle it or use QPdfDocument later
    // The roadmap says "QPdfDocument + pdf.js", we can use QPdfDocument to get page count if needed.
    emit pdfLoaded(base64, 0); 
}

void PdfBridge::translate(const QString &text, const QString &targetLang) {
    // Basic implementation for Phase 0/2
    // We'll use LibreTranslate as suggested in the roadmap later
    // For now, just a placeholder that emits the signal
    
    qDebug() << "Translating:" << text << "to" << targetLang;
    
    // Emitting a mock translation for testing Phase 0.3 round-trip
    emit translationReady(text, "[Translated: " + text + "]");
}
