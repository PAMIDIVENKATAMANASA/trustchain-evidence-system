## TrustChain Evidence System

A web application to manage digital evidence securely using a modern full‑stack architecture.  
Police officers can register, log in, and access a protected dashboard where future evidence features will be added.

---

## Tech Stack

- **Frontend**: React + Vite, JavaScript, CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB Atlas
- **Auth**: JWT-based authentication
- **Package Manager**: npm

---

## Features Implemented

### Application Structure & UI

- **Project setup**
  - Separate **frontend** (`client/`) and **backend** (`server/`) projects.
  - NPM scripts for development and running servers.

- **User interface**
  - **Home page**: Entry point with navigation to auth pages.
  - **Login page**: Form for email and password.
  - **Register page**: Form for name, email, password, role, and wallet address.
  - **Officer Dashboard**: Protected dashboard screen (currently placeholder text, ready for future evidence features).


- **Routing**
  - Frontend routing between Home, Login, Register, and Dashboard.
  - Dashboard access controlled using authentication (only accessible when logged in).

### Authentication & Database

- **MongoDB Atlas integration**
  - Backend connects to **MongoDB Atlas** using `MONGODB_URI` from environment variables.
  - User accounts are stored persistently in the cloud database.

- **User model**
  - `User` schema includes:
    - **name**
    - **email** (unique)
    - **password** (hashed)
    - **role**
    - **walletAddress`

- **Auth API**
  - `POST /api/auth/register`
    - Creates new users after validating input and hashing passwords.
    - Returns success or error (e.g., email already exists).
  - `POST /api/auth/login`
    - Validates email/password against stored users.
    - Returns a **JWT token** on successful login.
    - Returns clear error message for invalid credentials.

- **JWT middleware**
  - Middleware to verify JWT tokens from `Authorization: Bearer <token>`.
  - Attaches decoded user details to `req.user` for protected API routes.

- **Frontend auth integration**
  - Login and Register forms send requests to backend auth endpoints.
  - On successful login:
    - JWT token is **saved in `localStorage`**.
    - User is **redirected to the Dashboard**.
  - Errors (e.g., wrong password) are displayed to the user with friendly messages.

---

## High-Level Workflow

1. **New user registration**
   - User opens the **Register** page.
   - Fills in name, email, password, role, and wallet address.
   - Frontend sends a `POST /api/auth/register` request to the backend.
   - Backend:
     - Validates the data.
     - Hashes the password.
     - Saves the new user in **MongoDB Atlas**.
   - Frontend shows success or error based on server response.

2. **User login**
   - User opens the **Login** page.
   - Enters email and password.
   - Frontend sends `POST /api/auth/login` to the backend.
   - Backend:
     - Checks that user exists and password is correct.
     - Generates a **JWT token** if credentials are valid.
   - Frontend:
     - Stores token in `localStorage`.
     - Redirects user to the **Officer Dashboard**.
   - If login fails, the user sees an appropriate error and stays on the Login page.

3. **Accessing the dashboard (protected area)**
   - When visiting the Dashboard route, the app checks if a valid token exists in `localStorage`.
   - If token is missing/invalid → user is redirected to **Login**.
   - If token is valid → user can stay on the Dashboard (ready for future evidence features).

---

## How to Run the Project

### 1. Backend (server)

cd server

npm install

npm start   

### 2. Frontend (client)

cd client

npm install

npm run dev
