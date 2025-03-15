import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb+srv://job:AudUvPAbg0OVd8DW@time1.rlw9t.mongodb.net/?retryWrites=true&w=majority&appName=time1')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['user', 'business_owner'], required: true }
});

const User = mongoose.model('User', userSchema);

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bs: { type: String, required: true },
  description: String,
  location: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'business_owner', required: true }
});

const Business = mongoose.model('Business', businessSchema);


// Register Endpoint
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!['user', 'business_owner'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err });
  }
});

// Login Endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, 'secret', { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err });
  }
});

app.post('/business', async (req, res) => {
  const { name, bs, description, location, ownerId } = req.body;
  try {
    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== 'business_owner') {
      return res.status(403).json({ message: 'Only business owners can create businesses' });
    }
    const newBusiness = new Business({ name, bs, description, location, owner: ownerId });
    await newBusiness.save();
    res.json({ message: 'Business created successfully', business: newBusiness });
  } catch (err) {
    res.status(500).json({ message: 'Error creating business', error: err });
  }
});

app.get('/businesses', async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate('owner', 'name email')
      .select('name bs description location');
    res.json(businesses);
  } catch (err) {
    console.error('Error fetching businesses:', err);  // Log error details
    res.status(500).json({ message: 'Error fetching businesses', error: err.message });
  }
});
// Get Businesses by Business Owner
app.get('/businesses/:ownerId', async (req, res) => {
  const { ownerId } = req.params;
  try {
    const businesses = await Business.find({ owner: ownerId })
      .populate('owner', 'name email')
      .select('name bs description location');

    if (businesses.length === 0) {
      return res.status(404).json({ message: 'No businesses found for this owner' });
    }

    res.json(businesses);
  } catch (err) {
    console.error('Error fetching businesses for owner:', err);
    res.status(500).json({ message: 'Error fetching businesses', error: err.message });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));

export default app;

