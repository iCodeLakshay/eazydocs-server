import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import users from './routes/user.route.js'
import auth from './routes/auth.route.js';
import cookieParser from "cookie-parser";
import blogs from './routes/blogs.route.js';

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
app.use('/api/user', users);
app.use('/api/auth', auth);
app.use('/api/blogs', blogs);

// Health/welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Eazydocs API');
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});