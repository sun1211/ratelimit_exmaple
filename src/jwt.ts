import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'demo-secret-key';

app.use(express.json());

// Simple user storage
const users: Array<{ id: number; email: string; password: string }> = [];
let userIdCounter = 1;

// Auth middleware
const authenticateToken = (req: any, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  
  // Check if user exists
  if (users.find(u => u.email === email)) {
    res.status(400).json({ error: 'User already exists' });
    return;
  }

  // Hash password and save user
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: userIdCounter++, email, password: hashedPassword };
  users.push(user);

  // Generate token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ message: 'User registered', token, userId: user.id });
});

app.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  
  // Find user
  const user = users.find(u => u.email === email);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Check password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Generate token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ message: 'Login successful', token, userId: user.id });
});

app.get('/profile', authenticateToken, (req: any, res: Response) => {
  const user = users.find(u => u.id === req.userId);
  res.json({ message: 'Profile accessed', user: { id: user!.id, email: user!.email } });
});

// Demo route to test JWT flow
app.get('/demo', (req: Request, res: Response) => {
  res.json({
    message: 'JWT Authentication Demo',
    instructions: {
      '1. Register': 'POST /register with {"email":"test@test.com","password":"123456"}',
      '2. Login': 'POST /login with {"email":"test@test.com","password":"123456"}',
      '3. Access Profile': 'GET /profile with "Authorization: Bearer YOUR_TOKEN"'
    },
    examples: {
      register: {
        method: 'POST',
        url: '/register',
        body: { email: 'demo@example.com', password: 'password123' }
      },
      login: {
        method: 'POST', 
        url: '/login',
        body: { email: 'demo@example.com', password: 'password123' }
      },
      profile: {
        method: 'GET',
        url: '/profile',
        headers: { Authorization: 'Bearer YOUR_JWT_TOKEN_HERE' }
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 JWT Demo Server running on http://localhost:${PORT}`);
  console.log(`📚 Visit http://localhost:${PORT}/demo for instructions`);
  console.log('\nEndpoints:');
  console.log('  POST /register - Register user');
  console.log('  POST /login - Login user');  
  console.log('  GET /profile - Get profile (protected)');
  console.log('  GET /demo - View demo instructions');
});

export default app;