#!/usr/bin/env bash
set -euo pipefail

# jalankan dari root repo/atau parent folder yang punya healthstation-backend
# contoh: ~/healthstation
BACKEND_DIR="healthstation-backend"
if [ ! -d "$BACKEND_DIR" ]; then
  echo "Folder '$BACKEND_DIR' tidak ditemukan. Pastikan script dijalankan dari parent folder yang berisi folder $BACKEND_DIR"
  exit 1
fi

cd "$BACKEND_DIR"

# create data dir for H2 file
mkdir -p data

# create config dir for spring profile configs
mkdir -p src/main/resources/config

# write application-termux.properties (H2 file based DB persisted in ./data)
cat > src/main/resources/config/application-termux.properties <<'PROPS'
# Termux profile: file-based H2 DB stored in ./data/healthdb
spring.datasource.url=jdbc:h2:file:./data/healthdb;DB_CLOSE_ON_EXIT=FALSE;AUTO_SERVER=TRUE
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# app jwt default (change if needed)
app.jwt.secret=termux_default_change_me
app.jwt.expirationMs=604800000

# server port (you can change)
server.port=8080
PROPS

# helper run script
cat > run_termux.sh <<'RUN'
#!/usr/bin/env bash
set -euo pipefail
# usage: ./run_termux.sh [mvn|jar]   default: mvn
MODE=${1:-mvn}
echo "Running in Termux mode. MODE=$MODE"

if [ "$MODE" = "mvn" ]; then
  mvn -Dspring-boot.run.profiles=termux spring-boot:run
else
  mvn -B -DskipTests clean package
  # find jar
  JAR=$(ls -t target/*.jar 2>/dev/null | head -n1 || true)
  if [ -z "$JAR" ]; then
    echo "JAR not found. Run 'mvn package' first."
    exit 1
  fi
  echo "Starting jar with profile=termux..."
  java -Dspring.profiles.active=termux -jar "$JAR"
fi
RUN

chmod +x run_termux.sh

echo "Termux mode files created:"
echo " - src/main/resources/config/application-termux.properties"
echo " - run_termux.sh"
echo "Data folder: ./data (H2 DB file will be created here)"
echo "How to run next (see README in script output)."
