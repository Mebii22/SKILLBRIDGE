# SKILLBRIDGE — Backend REST API

Production-ready Node.js, Express.js, and MongoDB Atlas backend for **SKILLBRIDGE: Peer-to-Peer Skill Exchange Platform**.

---

## 🛠️ Tech Stack & Architecture

- **Runtime:** Node.js (CommonJS)
- **Framework:** Express.js 5
- **Database:** MongoDB Atlas (Cloud)
- **ODM:** Mongoose 9
- **Authentication:** JWT (JSON Web Tokens) with Bearer token header
- **Password Security:** bcryptjs (salted 10 rounds)
- **Rate Limiting:** In-memory sliding-window rate limiter for auth endpoints
- **CORS:** Configured for local development (`localhost:5173`, `localhost:3000`) and production client deployment (`CLIENT_URL`).
- **Payload Handling:** 10MB body parser with support for base64 avatars and image uploads.

```text
backend/
├── config/
│   └── db.js                 # MongoDB Atlas Mongoose connection
├── controllers/
│   ├── adminController.js     # Stats, user moderation, report review, skill approvals
│   ├── authController.js      # User registration, login, admin auth, me
│   ├── exchangeController.js  # Agreements, requests, session milestones, reviews
│   ├── messageController.js   # Peer conversations and messaging
│   ├── notificationController.js # Activity and agreement alerts
│   ├── sessionController.js   # Scheduled video and in-person sessions
│   ├── skillController.js     # Public skill listings CRUD
│   └── userController.js      # Discover, search, profile, password, bookmarks
├── middleware/
│   ├── authMiddleware.js      # JWT verification (protect) & admin role checks (adminOnly)
│   └── rateLimiter.js         # Sliding-window brute-force rate limiter
├── models/
│   ├── Conversation.js        # Embedded peer messages & read status
│   ├── Exchange.js            # Structured agreements, milestone sessions, progress %
│   ├── Message.js             # Direct message schema
│   ├── Notification.js        # Typed system notifications
│   ├── Report.js              # User moderation reports
│   ├── Session.js             # Calendar sessions (online & offline)
│   ├── Skill.js               # Community skill directory & admin status
│   └── User.js                # User accounts, skills, ratings, bookmarks, reviews
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── exchangeRoutes.js
│   ├── messageRoutes.js
│   ├── notificationRoutes.js
│   ├── sessionRoutes.js
│   ├── skillRoutes.js
│   └── userRoutes.js
├── utils/
│   ├── matchAlgorithm.js      # Smart matching algorithm
│   └── seedData.js            # Automated initial admin & demo data seed
├── package.json
└── server.js                  # Server entry point
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Manual Environment Configuration
Create a `.env` file directly inside the `backend/` folder:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/skillbridge_db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@skillbridge.com
ADMIN_PASSWORD=your_admin_password_here
```

| Variable | Description |
|---|---|
| `PORT` | Local port number (default: `5001`) |
| `NODE_ENV` | Application environment (`development` or `production`) |
| `MONGO_URI` | MongoDB Atlas cluster connection string with credentials |
| `JWT_SECRET` | Secret cryptographic key for signing JSON Web Tokens |
| `CLIENT_URL` | Frontend origin allowed by CORS policy |
| `ADMIN_EMAIL` | Default administrator email address |
| `ADMIN_PASSWORD` | Default administrator password for initial seed |

### 3. Start the Server
- **Development (with hot reload):**
  ```bash
  npm run dev
  ```
- **Production:**
  ```bash
  npm start
  ```

The server initializes on `http://localhost:5001`. On initial run, the database connection is verified and seeds the platform administrator if not already present.

---

## 📡 API Endpoints Reference

### Health Checks
- `GET /` — API welcome message
- `GET /api/health` — Microservice health status

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new member
- `POST /api/auth/login` — Login with email & password
- `POST /api/auth/admin/login` — Administrator authentication
- `GET /api/auth/me` *(Protected)* — Current authenticated user profile

### User Directory & Profiles (`/api/users`)
- `GET /api/users` — Discover community users with search & filters
- `GET /api/users/recommended` *(Protected)* — Personalized partner recommendations
- `GET /api/users/saved` *(Protected)* — Retrieve bookmarked profiles
- `POST /api/users/saved/:id` *(Protected)* — Toggle bookmark/save profile
- `GET /api/users/:id` — Get public user profile by ID
- `PUT /api/users/profile` *(Protected)* — Update personal profile details
- `PUT /api/users/change-password` *(Protected)* — Update account password
- `DELETE /api/users/account` *(Protected)* — Delete own user account

### Skill Directory (`/api/skills`)
- `GET /api/skills` — Get approved community skill listings
- `POST /api/skills` *(Protected)* — Submit a new skill listing
- `PUT /api/skills/:id` *(Protected)* — Update skill listing
- `DELETE /api/skills/:id` *(Protected)* — Remove own skill listing

### Skill Exchanges & Agreements (`/api/exchanges`)
- `GET /api/exchanges` *(Protected)* — Get user's skill exchanges
- `POST /api/exchanges` *(Protected)* — Submit exchange proposal
- `GET /api/exchanges/:id` *(Protected)* — Get exchange details
- `PATCH /api/exchanges/:id/status` *(Protected)* — Accept, decline, or cancel agreement
- `PATCH /api/exchanges/:id/milestone` *(Protected)* — Complete milestone session
- `POST /api/exchanges/:id/reviews` *(Protected)* — Submit rating and peer review

### Sessions Calendar (`/api/sessions`)
- `GET /api/sessions` *(Protected)* — Get upcoming and completed learning sessions
- `POST /api/sessions` *(Protected)* — Schedule a remote or in-person session
- `PUT /api/sessions/:id` *(Protected)* — Reschedule/update session
- `PATCH /api/sessions/:id/complete` *(Protected)* — Mark session completed
- `DELETE /api/sessions/:id` *(Protected)* — Cancel session

### Messages & Conversations (`/api/messages`)
- `GET /api/messages/conversations` *(Protected)* — Get active conversation threads
- `GET /api/messages/:conversationId` *(Protected)* — Get messages in a thread
- `POST /api/messages` *(Protected)* — Send message to peer

### Notifications (`/api/notifications`)
- `GET /api/notifications` *(Protected)* — Get user notifications
- `PATCH /api/notifications/:id/read` *(Protected)* — Mark single notification read
- `PATCH /api/notifications/read-all` *(Protected)* — Mark all notifications read

### Admin Control Panel (`/api/admin`) *(Admin Only)*
- `GET /api/admin/stats` — Overall counts (users, active swaps, listings, reports)
- `GET /api/admin/users` — Registered user roster
- `PATCH /api/admin/users/:id/toggle-status` — Toggle user account Active/Disabled
- `DELETE /api/admin/users/:id` — Delete user account
- `GET /api/admin/skills` — Community skills with moderation status
- `PATCH /api/admin/skills/:id/approve` — Approve user skill listing
- `DELETE /api/admin/skills/:id` — Remove skill listing
- `GET /api/admin/reports` — Community moderation reports
- `POST /api/admin/reports` *(Protected)* — File user incident report
- `PATCH /api/admin/reports/:id/resolve` — Resolve report incident

---

## ☁️ Manual Cloud Deployment

The backend is built with standard Node.js and Express, allowing deployment to any cloud hosting provider (e.g., Render, Railway, Heroku, AWS, DigitalOcean):

1. Set the **Root Directory** to `backend`.
2. Configure the build command: `npm install`.
3. Configure the start command: `node server.js`.
4. Configure environment variables (`MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=5001`, `CLIENT_URL`).
5. Ensure your MongoDB Atlas cluster allows network traffic from the cloud host.
