#pragma once

#include <QObject>
#include <QString>
#include <QJsonObject>
#include <QJsonDocument>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QFile>
#include <QFileDialog>
#include <QDebug>

class PdfBridge : public QObject {
    Q_OBJECT

public:
    explicit PdfBridge(QObject *parent = nullptr);

public slots:
    QString openFileDialog();
    void loadPdf(const QString &path);
    void translate(const QString &text, const QString &targetLang);

signals:
    void pdfLoaded(const QString &base64, int pageCount);
    void translationReady(const QString &original, const QString &translated);
    void errorOccurred(const QString &message);

private:
    QNetworkAccessManager *m_network;
};
