#include "pdfscheme.h"

PdfSchemeHandler::PdfSchemeHandler(QObject *parent)
    : QWebEngineUrlSchemeHandler(parent) {}

void PdfSchemeHandler::requestStarted(QWebEngineUrlRequestJob *job) {
  // The URL looks like: pdfreader:///absolute/path/to/file.pdf
  // url.path() extracts the absolute file system path.
  QUrl url = job->requestUrl();
  QString filePath = url.path();

  // Workaround for URL parsing where the first directory might be incorrectly
  // parsed as host
  if (!url.host().isEmpty()) {
    filePath = "/" + url.host() + filePath;
  }

  qDebug() << "[PdfScheme] Request for:" << filePath;

  if (filePath.isEmpty()) {
    qDebug() << "[PdfScheme] Empty path, failing request";
    job->fail(QWebEngineUrlRequestJob::RequestFailed);
    return;
  }

  // Parent the QFile to the job so it is automatically deleted when
  // the job is destroyed (i.e. after the reply is fully consumed).
  auto *file = new QFile(filePath, job);

  if (!file->exists()) {
    qDebug() << "[PdfScheme] File not found:" << filePath;
    job->fail(QWebEngineUrlRequestJob::UrlNotFound);
    return;
  }

  if (!file->open(QIODevice::ReadOnly)) {
    qDebug() << "[PdfScheme] Cannot open file:" << file->errorString();
    job->fail(QWebEngineUrlRequestJob::RequestFailed);
    return;
  }

  qDebug() << "[PdfScheme] Serving" << filePath << "(" << file->size()
           << "bytes)";

  // Reply with the raw PDF bytes — Chromium streams this directly into
  // the renderer process without any encoding or QWebChannel round-trip.
  job->reply("application/pdf", file);
}
