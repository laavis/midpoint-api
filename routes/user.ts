import { Router, Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import validateRegisterInput from '../validation/register';
import validateLoginInput from '../validation/login';
import User, { IUser } from '../models/User';

const router = Router();

/**
 * @route   GET users/test
 * @desc    Tests users route
 * @access  Public
 */
router.get('/test', (req: Request, res: Response) => res.json({ msg: 'User works' }));

/**
 * @route   POST users/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { errors, isValid } = validateRegisterInput(req.body);

    // Check validation
    if (!isValid) {
      console.log('not valid');
      return res.json(errors);
    }

    const userEmail = await User.findOne({ email: req.body.email }).exec();
    // Check if user with same email already exists
    if (userEmail) return res.json({ email: 'Email already exists' });

    const username = await User.findOne({ username: req.body.username }).exec();

    if (username) return res.json({ username: 'Username is already taken' });

    // Create new user
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    });

    // Hash user password
    bcrypt.genSalt(10, (_, salt) => {
      bcrypt.hash(newUser.password, salt, async (err, hash) => {
        if (err) throw err;
        newUser.password = hash;
        newUser.password = hash;
        const savedUser = await newUser.save();
        return res.json({
          success: true,
          user: savedUser
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST api/users/login
// @desc    Login user / Returning JWT Token
// @access  Private
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { errors, isValid } = validateLoginInput(req.body);

    // Check validation
    if (!isValid) {
      return res.json(errors);
    }

    const email = req.body.email;
    const password = req.body.password;

    // Find user by email
    // Match user email to req.body.user
    const savedUser = await User.findOne({ email }).exec();
    // Check for user
    if (!savedUser) {
      errors.email = 'User not found';
      return res.json(errors);
    }
    // Check password
    bcrypt.compare(password, savedUser.password).then(isMatch => {
      if (isMatch) {
        // User matched
        const payload = {
          id: savedUser.id,
          username: savedUser.username
        }; // Create JWT payload

        // Sign token that expires in 24h
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 86400 }, (_, token) => {
          res.json({
            success: true,
            user: savedUser,
            token: `Bearer ${token}`
          });
        });
      } else {
        errors.password = 'Invalid credentials';
        return res.json(errors);
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST user/current
 * @desc    Return current user (whoever the JWT belongs to)
 * @access  Private
 */
router.get('/current', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const friends = [];
  for (const userId of user.friendsList) {
    const friend = await User.findById(userId, { username: 1 }).exec();
    friends.push(friend);
  }
  res.json({
    id: user._id,
    username: user.username,
    friendsList: friends,
    email: user.email
  });
});

/**
 * @route   POST user/update/token
 * @desc    Update the current user's token
 * @access  Private
 */
router.post(
  '/update/token',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      const token = req.body.firebaseToken;

      if (!token) {
        console.log('no token');
        return res.json({ success: false, errors: 'Missing firebase token' });
      }
      const updateUser = await User.findByIdAndUpdate({ _id: user._id }, { firebaseToken: token }).exec();
      updateUser.save();
      return res.json({ success: true, msg: 'Token successfully updated' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
