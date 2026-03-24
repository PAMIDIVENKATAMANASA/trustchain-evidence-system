ailed to load resource: the server responded with a status of 404 (Not Found)### ✅ TrustChain Evidence System

A secure full-stack web application for managing digital evidence using blockchain-style storage through IPFS.

Police officers can register, log in, upload evidence files, and store them securely on the IPFS (InterPlanetary File System) network while managing metadata in MongoDB.

The system ensures tamper-resistant evidence storage, secure authentication, and transparent access for authorized users like officers, judges, and lawyers.

🛠 Tech Stack

Frontend: React (Vite), JavaScript, CSS
Backend: Node.js, Express
Database: MongoDB Atlas
Authentication: JWT (JSON Web Token)
File Upload: Multer
Distributed Storage:IPFS (InterPlanetary File System)
IPFS Client:ipfs-http-client


🚀 Key Features

🔐 Secure Authentication
👮 Role-Based Access Control
📂 Evidence Management
🌐 IPFS Integration
📊 Officer Dashboard


▶ How to Run the Project

🧩 IPFS Installation & Setup
1️⃣ Install IPFS

Download IPFS from the official website:

2️⃣ Initialize IPFS
ipfs init

3️⃣ Start IPFS Daemon
ipfs daemon(terminal-1)

Backend (Server)
cd server

npm install

npm start

## Frontend (Client)

cd client

npm install

npm run dev(terminal-3)
