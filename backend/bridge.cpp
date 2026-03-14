#include "bridge.h"

PdfBridge::PdfBridge(QWidget *parentWidget, QObject *parent)
    : QObject(parent), m_parentWidget(parentWidget) {
  m_network = new QNetworkAccessManager(this);
  qDebug() << "[Bridge] PdfBridge created, parentWidget:" << m_parentWidget;
  initDatabase();
}

void PdfBridge::initDatabase() {
  QString dataPath =
      QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
  QDir().mkpath(dataPath);
  QString dbPath = dataPath + "/library.db";

  m_db = QSqlDatabase::addDatabase("QSQLITE");
  m_db.setDatabaseName(dbPath);

  if (!m_db.open()) {
    qDebug() << "[Bridge] Error opening database:" << m_db.lastError().text();
    return;
  }

  QSqlQuery query;
  bool ok = query.exec("CREATE TABLE IF NOT EXISTS books ("
                       "id TEXT PRIMARY KEY, "
                       "title TEXT NOT NULL, "
                       "path TEXT UNIQUE NOT NULL, "
                       "cover TEXT, "
                       "last_opened_at TEXT NOT NULL)");

  // Migration for existing databases without cover column
  if (ok) {
    query.exec("ALTER TABLE books ADD COLUMN cover TEXT");
  }
  if (!ok) {
    qDebug() << "[Bridge] Error creating table:" << query.lastError().text();
  }
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

QVariantList PdfBridge::getBooks() {
  QVariantList books;
  QSqlQuery query(
      "SELECT id, title, path, cover FROM books ORDER BY last_opened_at DESC");

  while (query.next()) {
    QVariantMap book;
    QString path = query.value(2).toString();
    book["id"] = query.value(0).toString();
    book["title"] = query.value(1).toString();
    book["path"] = path;
    book["cover"] = query.value(3).toString();
    book["isValid"] = QFile::exists(path);
    books.append(book);
  }
  return books;
}

QVariantMap PdfBridge::addBook(const QString &path) {
  QVariantMap result;
  if (path.isEmpty() || !QFile::exists(path)) {
    return result;
  }

  QFileInfo fileInfo(path);
  QString title = fileInfo.completeBaseName();
  QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
  QString now = QDateTime::currentDateTime().toString(Qt::ISODate);

  QSqlQuery query;
  query.prepare(
      "INSERT OR REPLACE INTO books (id, title, path, last_opened_at) "
      "VALUES (:id, :title, :path, :now)");
  query.bindValue(":id", id);
  query.bindValue(":title", title);
  query.bindValue(":path", path);
  query.bindValue(":now", now);

  if (query.exec()) {
    result["id"] = id;
    result["title"] = title;
    result["path"] = path;
    result["isValid"] = true;
  } else {
    qDebug() << "[Bridge] Error adding book:" << query.lastError().text();
  }

  return result;
}

void PdfBridge::updateBookCover(const QString &id, const QString &coverBase64) {
  QSqlQuery query;
  query.prepare("UPDATE books SET cover = :cover WHERE id = :id");
  query.bindValue(":cover", coverBase64);
  query.bindValue(":id", id);

  if (!query.exec()) {
    qDebug() << "[Bridge] Error updating book cover:"
             << query.lastError().text();
  } else {
    qDebug() << "[Bridge] Book cover updated for ID:" << id;
  }
}

void PdfBridge::removeBook(const QString &id) {
  QSqlQuery query;
  query.prepare("DELETE FROM books WHERE id = :id");
  query.bindValue(":id", id);

  if (!query.exec()) {
    qDebug() << "[Bridge] Error removing book:" << query.lastError().text();
  } else {
    qDebug() << "[Bridge] Book removed with ID:" << id;
  }
}
