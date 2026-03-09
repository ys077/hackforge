# HackForge Backend

A production-ready backend for an informal workers platform that helps workers discover nearby jobs, generate resumes, verify documents, apply for government schemes, and schedule interviews.

## 🚀 Features

- **User Onboarding**: OTP-based registration with role selection (Worker/Employer)
- **Document Verification**: Upload & verify Aadhar, PAN, and other documents
- **AI Resume Builder**: Generate professional resumes from worker profiles
- **Job Matching Engine**: AI-powered job recommendations based on skills and location
- **Scheme Discovery**: Find and apply for relevant government welfare schemes
- **Interview Scheduling**: Book interview slots with real-time availability
- **Real-time Notifications**: Push notifications via Socket.IO

## 🛠 Tech Stack

### Backend API (Node.js)

- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Caching**: Redis with ioredis
- **Queue**: BullMQ for background jobs
- **Auth**: JWT with refresh tokens
- **Validation**: Joi
- **File Upload**: Multer
- **Real-time**: Socket.IO
- **Logging**: Winston

### ML Service (Python)

- **Framework**: FastAPI
- **ML**: scikit-learn, sentence-transformers
- **OCR**: pytesseract

## 📋 Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## 🔧 Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/hackforge.git
cd hackforge/backend
```

### 2. Install dependencies

```bash
# Node.js backend
npm install

# Python ML service
cd ml-service
pip install -r requirements.txt
```

### 3. Configure environment

```bash
# Copy example environment files
cp .env.example .env
cp ml-service/.env.example ml-service/.env

# Edit .env with your configuration
```

### 4. Setup database

```bash
# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

### 5. Start services

```bash
# Start Node.js backend
npm run dev

# Start ML service (in another terminal)
cd ml-service
python main.py
```

## 🐳 Docker Deployment

### Development

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Production

```bash
docker-compose up --build -d
```

## 📚 API Documentation

### Base URL

- Development: `http://localhost:3000/api/v1`
- ML Service: `http://localhost:8001`

### Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <access_token>
```

### Endpoints

#### Auth

| Method | Endpoint                 | Description                  |
| ------ | ------------------------ | ---------------------------- |
| POST   | `/auth/send-otp`         | Send OTP to phone number     |
| POST   | `/auth/verify-otp`       | Verify OTP and get tokens    |
| POST   | `/auth/complete-profile` | Complete user profile        |
| POST   | `/auth/refresh`          | Refresh access token         |
| POST   | `/auth/logout`           | Logout and invalidate tokens |

#### Workers

| Method | Endpoint                   | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/workers/profile`         | Get worker profile    |
| PUT    | `/workers/profile`         | Update worker profile |
| POST   | `/workers/skills`          | Add skills            |
| DELETE | `/workers/skills/:skillId` | Remove skill          |
| GET    | `/workers/dashboard`       | Get dashboard stats   |

#### Jobs

| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------ |
| GET    | `/jobs`             | List jobs (with filters) |
| GET    | `/jobs/:id`         | Get job details          |
| POST   | `/jobs`             | Create job (employer)    |
| PUT    | `/jobs/:id`         | Update job (employer)    |
| POST   | `/jobs/:id/apply`   | Apply for job            |
| GET    | `/jobs/nearby`      | Get nearby jobs          |
| GET    | `/jobs/recommended` | Get recommended jobs     |

#### Documents

| Method | Endpoint            | Description          |
| ------ | ------------------- | -------------------- |
| POST   | `/documents/upload` | Upload document      |
| GET    | `/documents`        | List user documents  |
| GET    | `/documents/:id`    | Get document details |
| DELETE | `/documents/:id`    | Delete document      |

#### Resumes

| Method | Endpoint            | Description        |
| ------ | ------------------- | ------------------ |
| POST   | `/resumes/generate` | Generate AI resume |
| GET    | `/resumes`          | List user resumes  |
| GET    | `/resumes/:id`      | Get resume         |
| PUT    | `/resumes/:id`      | Update resume      |

#### Schemes

| Method | Endpoint                         | Description             |
| ------ | -------------------------------- | ----------------------- |
| GET    | `/schemes`                       | List government schemes |
| GET    | `/schemes/:id`                   | Get scheme details      |
| POST   | `/schemes/:id/check-eligibility` | Check eligibility       |
| POST   | `/schemes/:id/apply`             | Apply for scheme        |
| GET    | `/schemes/applications`          | List applications       |

#### Interviews

| Method | Endpoint                 | Description          |
| ------ | ------------------------ | -------------------- |
| GET    | `/interviews/slots`      | Get available slots  |
| POST   | `/interviews/book`       | Book interview slot  |
| GET    | `/interviews`            | List user interviews |
| PUT    | `/interviews/:id/cancel` | Cancel booking       |

## 🗄 Database Schema

### Core Tables

- `users` - User accounts with role (worker/employer/admin)
- `workers` - Worker profiles with skills and experience
- `employers` - Employer/company profiles
- `skills` - Skill catalog

### Job Module

- `jobs` - Job listings
- `applications` - Job applications

### Document Module

- `documents` - Uploaded documents
- `trust_scores` - Worker trust scores

### Resume Module

- `resumes` - Generated resumes

### Scheme Module

- `government_schemes` - Available schemes
- `scheme_applications` - Scheme applications

### Interview Module

- `interview_slots` - Available time slots
- `interview_bookings` - Booked interviews

### Notification Module

- `notifications` - User notifications

## 🔐 Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=hackforge
DB_PASSWORD=your_password
DB_NAME=hackforge_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OTP
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6

# ML Service
ML_SERVICE_URL=http://localhost:8001

# MapTiler
MAPTILER_API_KEY=your-api-key

# SMS Provider (optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email Provider (optional)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=
EMAIL_FROM=noreply@hackforge.com
```

## 📦 Scripts

```bash
npm run dev       # Start development server
npm start         # Start production server
npm run migrate   # Run database migrations
npm run seed      # Seed database with initial data
npm run reset     # Reset database (destructive!)
npm test          # Run tests
npm run lint      # Run ESLint
```

## 🚢 Railway Deployment

1. Create a new project on Railway
2. Add PostgreSQL and Redis services
3. Connect your GitHub repository
4. Configure environment variables
5. Deploy!

Railway will automatically detect the `railway.toml` configuration.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration modules
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── ml-service/          # Python ML microservice
│   ├── routers/         # FastAPI routers
│   ├── services/        # ML services
│   ├── main.py          # FastAPI entry point
│   └── requirements.txt
├── scripts/             # Database scripts
├── uploads/             # File uploads directory
├── docker-compose.yml   # Docker configuration
├── Dockerfile           # Production Dockerfile
└── package.json
```

## 🔒 Security

- JWT tokens with short expiry (15 min)
- Refresh token rotation
- Rate limiting on all endpoints
- Input validation with Joi
- SQL injection prevention via Sequelize
- XSS protection with Helmet
- CORS configuration
- Password hashing with bcrypt

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## 📄 License

MIT License - see LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📞 Support

For support, email support@hackforge.com or open an issue on GitHub.
