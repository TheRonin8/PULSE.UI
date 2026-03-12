# SenseBoard - IoT Sensor Dashboard

## Getting Started

```bash
npm install
npm start
```

## Folder Structure

```
senseboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Navbar.jsx       ✅ Phase 1
│   │   ├── Header.jsx       ✅ Phase 1
│   │   ├── Footer.jsx       ✅ Phase 1
│   │   └── Layout.jsx       ✅ Phase 1
│   ├── pages/
│   │   ├── Login.jsx        🔜 Phase 2
│   │   └── Dashboard.jsx    🔜 Phase 2
│   ├── services/
│   │   ├── api.js           🔜 Phase 2
│   │   └── mockData.js      🔜 Phase 2
│   ├── context/
│   │   └── AuthContext.jsx  🔜 Phase 2
│   ├── hooks/
│   │   └── usePolling.js    🔜 Phase 2
│   ├── utils/
│   │   └── constants.js     ✅ Phase 1
│   ├── App.jsx
│   ├── index.js
│   └── index.css            ✅ Phase 1
├── .env
└── package.json
```

## Environment Variables
- `REACT_APP_API_URL` — Backend API base URL (default: `http://localhost:5000/api`)
