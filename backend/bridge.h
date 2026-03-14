#pragma once

#include <QDateTime>
#include <QDebug>
#include <QDir>
#include <QFile>
#include <QFileDialog>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QObject>
#include <QSqlDatabase>
#include <QSqlError>
#include <QSqlQuery>
#include <QStandardPaths>
#include <QString>
#include <QUuid>
#include <QVariantList>
#include <QWidget>

class PdfBridge : public QObject {
  Q_OBJECT

public:
  explicit PdfBridge(QWidget *parentWidget = nullptr,
                     QObject *parent = nullptr);

public slots:
  QString openFileDialog();
  void loadPdf(const QString &path);
  void translate(const QString &text, const QString &targetLang);

  // Library Methods
  QVariantList getBooks();
  QVariantMap addBook(const QString &path);
  void updateBookCover(const QString &id, const QString &coverBase64);
  void removeBook(const QString &id);

signals:
  void pdfLoaded(const QString &base64, int pageCount);
  void translationReady(const QString &original, const QString &translated);
  void errorOccurred(const QString &message);

private:
  void initDatabase();
  QWidget *m_parentWidget;
  QNetworkAccessManager *m_network;
  QSqlDatabase m_db;
};
