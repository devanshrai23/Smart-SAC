# Smart-SAC

**Smart-SAC** (Student Activity Center) is a comprehensive full-stack application designed to modernize and streamline the management of student activity centers. Developed as a DBMS Group Project, it provides a unified platform for students to manage sports equipment, book facilities, communicate with peers, and raise issues, while giving administrators a powerful dashboard to oversee operations.

---

## 🚀 Features and Functionality

### For Students
- **Domain-Restricted Authentication:** Secure sign-up and login restricted exclusively to official institute email addresses (e.g., `@iiita.ac.in`), featuring email verification.
- **Equipment Management:** Browse available sports equipment (Cricket, Volleyball, Basketball, Lawn Tennis, Football, etc.), check them out for a specific duration, and view personal checkout history.
- **Facility Booking:** Check the real-time availability of rooms and sports facilities, and book time slots.
- **Peer-to-Peer Chat:** A built-in messaging system allowing students to communicate and coordinate activities with each other.
- **Ticketing System:** Seamlessly raise tickets for broken equipment or facility issues directly to the administration.
- **User Profiles & Game Ratings:** Maintain personal profiles, showcase achievements, and track skill ratings across various games.
- **Announcements:** Stay updated with real-time announcements broadcasted by the administration.

### For Administrators
- **Admin Dashboard:** A comprehensive centralized dashboard featuring statistical charts and metrics (powered by Recharts).
- **Issue Management:** View, update, and resolve user-submitted tickets.
- **Inventory Oversight:** Track the real-time status of all equipment and monitor detailed equipment history and checkout logs.
- **Games & Facilities Management:** Add or remove sports/games and manage room capacities and availability.

---

## 💻 Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui & Radix UI
- **Routing:** React Router v6
- **State Management & Data Fetching:** React Query (@tanstack/react-query)
- **Forms & Validation:** React Hook Form & Zod
- **Data Visualization:** Recharts

### Backend
- **Framework:** Node.js & Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **File Uploads:** Multer & Cloudinary
- **Email Services:** Nodemailer (for OTPs and verification)
- **Task Scheduling:** node-cron

---

## 🛠️ Steps to Run the Project

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL installed and running
- Cloudinary account (for image uploads)
- SMTP credentials (e.g., Gmail App Password for sending emails)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Smart-SAC
```

### 2. Backend Setup
Open a terminal and navigate to the backend directory:
```bash
cd backend
```
Install dependencies:
```bash
npm install
```
Create a `.env` file in the `backend` directory and add the following variables:
```env
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<database_name>?schema=public"
JWT_SECRET="your_jwt_secret_key"
PORT=5000

# Nodemailer SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```
Run Prisma migrations to initialize the database schema:
```bash
npx prisma migrate dev
```
Seed the database with initial data (equipment, admin accounts, etc.):
```bash
npm run seed
```
Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```
Install dependencies:
```bash
npm install
```
Create a `.env` file in the `frontend` directory and add your backend API URL:
```env
VITE_API_URL="http://localhost:5000"
```
Start the frontend development server:
```bash
npm run dev
```

### 4. Access the Application
Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).
