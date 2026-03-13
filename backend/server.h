#pragma once

#include <QDateTime>
#include <QHostAddress>
#include <QJsonDocument>
#include <QJsonObject>
#include <QList>
#include <QObject>
#include <QRandomGenerator>
#include <QTimer>
#include <QWebSocket>
#include <QWebSocketServer>

class DashboardServer : public QObject {
  Q_OBJECT

public:
  explicit DashboardServer(quint16 port, QObject *parent = nullptr)
      : QObject(parent),
        m_server("DashboardServer", QWebSocketServer::NonSecureMode, this) {
    if (m_server.listen(QHostAddress::LocalHost, port)) {
      connect(&m_server, &QWebSocketServer::newConnection, this,
              &DashboardServer::onNewConnection);

      // Push fake data every second
      m_timer.setInterval(1000);
      connect(&m_timer, &QTimer::timeout, this, &DashboardServer::pushData);
      m_timer.start();

      qDebug() << "WebSocket server listening on port" << port;
    }
  }

private slots:
  void onNewConnection() {
    QWebSocket *client = m_server.nextPendingConnection();
    connect(client, &QWebSocket::textMessageReceived, this,
            &DashboardServer::onMessage);
    connect(client, &QWebSocket::disconnected, this,
            &DashboardServer::onDisconnected);
    m_clients << client;
    qDebug() << "Client connected:" << client->peerAddress().toString();
  }

  void onMessage(const QString &message) {
    // Handle commands from Svelte
    auto sender = qobject_cast<QWebSocket *>(QObject::sender());
    qDebug() << "Message from client:" << message;
    // TODO: parse JSON and act on commands
  }

  void onDisconnected() {
    auto client = qobject_cast<QWebSocket *>(QObject::sender());
    m_clients.removeAll(client);
    client->deleteLater();
  }

  void pushData() {
    // Replace this with your real data source
    QJsonObject payload;
    payload["timestamp"] = QDateTime::currentSecsSinceEpoch();
    payload["temperature"] =
        20.0 + QRandomGenerator::global()->bounded(100) / 10.0;
    payload["pressure"] = 1.0 + QRandomGenerator::global()->bounded(50) / 100.0;
    payload["rpm"] = 1000 + QRandomGenerator::global()->bounded(500);

    QString json = QJsonDocument(payload).toJson(QJsonDocument::Compact);
    for (QWebSocket *client : m_clients)
      client->sendTextMessage(json);
  }

private:
  QWebSocketServer m_server;
  QList<QWebSocket *> m_clients;
  QTimer m_timer;
};
