✅ TrustChain Evidence System

A secure full-stack web application for managing digital evidence.  
Police officers can register, log in, upload evidence files, and view them in a protected dashboard.

🛠 Tech Stack

- Frontend: React (Vite), JavaScript, CSS  
- Backend: Node.js, Express  
- Database: MongoDB Atlas  
- Authentication: JWT (JSON Web Token)  
- File Upload: Multer  

🚀 Key Features

- User registration and login with JWT authentication  
- Role-based access control (Officer role)  
- Protected officer dashboard  
- Evidence file upload with metadata storage  
- Evidence listing for logged-in officers  
- MongoDB schema for evidence tracking  

📁 Evidence Data Stored

- Evidence ID (auto-increment)  
- File name, file type, file size  
- Collector ID and collector name  
- Description  
- GPS coordinates (optional)  
- Timestamp  
- Status (default: sealed)  

🔄 Application Workflow

- **Register**: User signs up → password hashed → stored in MongoDB  
- **Login**: User logs in → JWT token generated → stored in `localStorage`  
- **Dashboard**: Accessible only with a valid JWT token  
- **Evidence Upload**: Officer uploads a file → metadata saved in MongoDB  
- **Evidence List**: Officers can view their uploaded evidence  

▶ How to Run the Project

### Backend (Server)

cd server
npm install
npm start

### Frontend (Client)

cd client
npm install
npm run dev
