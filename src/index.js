import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import users_routes from './routes/user.route.js'
import auth_routes from './routes/auth.route.js';
import cookieParser from "cookie-parser";
import blogs_routes from './routes/blogs.route.js';
import otp_routes from './routes/otp.route.js'
dotenv.config();
const app = express();

const CORS_OPTIONS = {
  origin: [process.env.CLIENT_BASE_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply middleware first
app.use(cors(CORS_OPTIONS));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api/user', users_routes);
app.use('/api/auth', auth_routes);
app.use('/api/blogs', blogs_routes);
app.use('/api/otp', otp_routes);
// Health/welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Eazydocs API');
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});