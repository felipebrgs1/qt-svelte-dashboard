#include "server.h"
#include <QApplication>
#include <QDir>
#include <QProcessEnvironment>
#include <QUrl>
#include <QWebEngineView>

int main(int argc, char *argv[]) {
  QApplication app(argc, argv);

  // Start WebSocket server on port 8080
  DashboardServer server(8080);

  QWebEngineView view;

  // Dev mode: set DASHBOARD_DEV_URL=http://localhost:5173 to load from Vite
  // Production mode: loads the built frontend/dist/ copied next to the binary
  QString devUrl =
      QProcessEnvironment::systemEnvironment().value("DASHBOARD_DEV_URL");
  if (!devUrl.isEmpty()) {
    qDebug() << "[dev] Loading frontend from" << devUrl;
    view.load(QUrl(devUrl));
  } else {
    QString frontendPath = QDir(QCoreApplication::applicationDirPath())
                               .filePath("frontend/index.html");
    qDebug() << "[prod] Loading frontend from" << frontendPath;
    view.load(QUrl::fromLocalFile(frontendPath));
  }

  view.setWindowTitle("Qt + Svelte Dashboard");
  view.resize(1280, 720);
  view.show();

  return app.exec();
}
