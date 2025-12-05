Run instructions (Termux / Linux)

1) Backend (no Docker):
cd ~/healthstation/backend
npm install
node migrate.js
node migrations-add-attendance-status.js
node setup-admin.js admin@rumahsakit.or.id StrongPass123 "Admin Utama"
node server-sqlite.js
-- Server runs on http://localhost:4001

2) Frontend:
cd ~/healthstation/frontend
npx http-server . -p 8080 -c-1
-- Open http://localhost:8080/index.html

Note: Docker on Termux is not supported by default. Use local Node flow.
