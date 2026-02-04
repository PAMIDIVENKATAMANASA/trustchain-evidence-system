## TrustChain – Digital Evidence System (Week 1)

### 🎯 Project Overview

TrustChain is a blockchain-based digital evidence management system.  
Stack: **React (Vite)**, **Node/Express**, **MongoDB**, **IPFS**, **Ethereum Sepolia**.

This repo shows my project progress week by week.  
This is **Week 1: Project setup + basic UI**.

---

### ✅ Week 1 Deliverables

- Initialized **client** (React) and **server** (Express) projects.
- Created **Login** and **Register** pages UI.
- Created a simple **Officer Dashboard** layout.
- Documented how to run the app locally.

> Backend APIs and blockchain/IPFS are not fully implemented yet in Week 1.  
> This week focuses on structure + basic screens.

---

### 🧱 Project Structure (Week 1)

- `client/` – React frontend (Vite)
  - `src/main.jsx` – app entry
  - `src/App.jsx` – routes/layout
  - `src/components/Login.jsx` – login form UI
  - `src/components/Register.jsx` – registration form UI
  - `src/components/OfficerDashboard.jsx` – placeholder dashboard for officer
- `server/` – Node.js / Express backend
  - `server.js` – basic Express app with health route
- `PROGRESS.md` – week-by-week progress log

---

### ▶️ How to Run (Week 1)

#### 1. Install dependencies

# Frontend
cd client
npm install

# Backend
cd ../server
npm install#### 2. Start backend server (simple health check)

cd server
npm startServer listens on `http://localhost:5000` (e.g., `GET /api/health`).

#### 3. Start frontend

cd client
npm run devBy default, Vite runs at `http://localhost:5173`.

---

### 🖥️ What You Can See Now (Week 1)

- **Login Page**  
  - Email + password inputs  
  - Submit button (UI only / or basic request)

- **Register Page**  
  - Name, email, password, role fields  
  - Submit button (UI only / or basic request)

- **Officer Dashboard (basic)**  
  - Placeholder content showing where evidence upload/list will be.

In the next weeks, I will connect these pages to real APIs, MongoDB, IPFS, and Ethereum Sepolia.
