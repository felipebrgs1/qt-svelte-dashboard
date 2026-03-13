#include "bridge.h"
#include <QApplication>
#include <QDir>
#include <QProcessEnvironment>
#include <QUrl>
#include <QWebEngineView>
#include <QWebEnginePage>
#include <QWebChannel>

int main(int argc, char *argv[]) {
  QApplication app(argc, argv);

  QWebEngineView view;
  
  // Setup QWebChannel
  QWebChannel *channel = new QWebChannel(&view);
  PdfBridge *bridge = new PdfBridge(&view);
  channel->registerObject("bridge", bridge);
  view.page()->setWebChannel(channel);

  // Dev mode: set DASHBOARD_DEV_URL=http://localhost:5173 to load from Vite
  QString devUrl =
      QProcessEnvironment::systemEnvironment().value("DASHBOARD_DEV_URL");
  if (!devUrl.isEmpty()) {
    qDebug() << "[dev] Loading frontend from" << devUrl;
    view.load(QUrl(devUrl));
  } else {
    // In production, we'll use qrc or a local file.
    // The previous code looked for frontend/index.html next to binary.
    QString frontendPath = QDir(QCoreApplication::applicationDirPath())
                               .filePath("frontend/index.html");
    qDebug() << "[prod] Loading frontend from" << frontendPath;
    view.load(QUrl::fromLocalFile(frontendPath));
  }

  view.setWindowTitle("PDF Reader with Translation");
  view.resize(1280, 720);
  view.show();

  return app.exec();
}
