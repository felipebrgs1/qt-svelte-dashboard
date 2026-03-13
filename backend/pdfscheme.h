#pragma once

#include <QDebug>
#include <QFile>
#include <QWebEngineUrlRequestJob>
#include <QWebEngineUrlSchemeHandler>

/**
 * PdfSchemeHandler
 *
 * Handles requests for the custom "pdfreader://" URL scheme.
 * When pdf.js requests "pdfreader:///absolute/path/to/file.pdf",
 * this handler reads the file from disk and streams it back to the
 * renderer process — zero base64 encoding, zero QWebChannel overhead.
 *
 * Registration (must happen before QApplication):
 *   QWebEngineUrlScheme scheme("pdfreader");
 *   scheme.setFlags(...);
 *   QWebEngineUrlScheme::registerScheme(scheme);
 *
 * Installation (after QWebEngineView is created):
 *   view.page()->profile()->installUrlSchemeHandler("pdfreader", handler);
 */
class PdfSchemeHandler : public QWebEngineUrlSchemeHandler {
  Q_OBJECT

public:
  explicit PdfSchemeHandler(QObject *parent = nullptr);

  void requestStarted(QWebEngineUrlRequestJob *job) override;
};
