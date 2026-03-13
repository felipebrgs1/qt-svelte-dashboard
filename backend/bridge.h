#pragma once

#include <QDebug>
#include <QFile>
#include <QFileDialog>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QObject>
#include <QString>
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

signals:
  void pdfLoaded(const QString &base64, int pageCount);
  void translationReady(const QString &original, const QString &translated);
  void errorOccurred(const QString &message);

private:
  QWidget *m_parentWidget;
  QNetworkAccessManager *m_network;
};
