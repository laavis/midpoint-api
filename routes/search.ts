import { Router, Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import User, { IUser } from '../models/User';
import FriendRequest from '../models/FriendRequest';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'Search works' }));

/**
 * @route   GET search/users
 * @desc    Get all users matching search string
 * @access  Private
 */

interface IUserReponse {
  _id: String;
  username: String;
  isFriend?: Boolean;
  isRequestSent?: Boolean;
}

interface ISearchResponse {}

router.get(
  '/users',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const searcher = req.user as IUser;

      const searchTerm = req.query.username;

      if (!searchTerm.length) {
        return res.json({ users: [] });
      }

      const matchingUsers = await User.find({ username: { $regex: searchTerm } }, { username: 1, _id: 1 });
      const searchResults: IUserReponse[] = [];

      // Some fuckery to get friendship status to users searh results
      for (let user of matchingUsers) {
        const friendRequest = await FriendRequest.findOne({
          requester: searcher._id,
          receiver: user._id
        }).exec();

        if (friendRequest) {
          searchResults.push({
            _id: user.id,
            username: user.username,
            isFriend: searcher.friendsList.includes(user._id),
            isRequestSent: !!friendRequest
          });
        } else {
          searchResults.push({
            _id: user.id,
            username: user.username,
            isFriend: false,
            isRequestSent: false
          });
        }
      }

      return res.json({ users: searchResults });
    } catch (e) {
      next(e);
    }
  }
);
export default router;
