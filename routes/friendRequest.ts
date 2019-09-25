import { Router, Request, Response, NextFunction, request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import User, { IUser } from '../models/User';
import FriendRequest from '../models/FriendRequest';
import { resolveSoa } from 'dns';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'FriendRequest works' }));

/**
 * @route   POST friend-request/request
 * @desc    Send friend request with user id
 * @access  Private
 */
router.post(
  '/request',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requester = req.user as IUser;

      // username of the receiver
      const username = req.body.receiver;

      const receiver = await User.findOne({ username }).exec();

      if (!receiver) res.status(404).json('User not found');

      const friendRequest = await FriendRequest.findOne({
        requester: requester._id,
        receiver: receiver._id
      }).exec();

      if (friendRequest) {
        return res.json({ msg: 'exists' });
      }

      const newFriendRequest = new FriendRequest({
        requester: requester._id,
        receiver: receiver._id,
        status: 0
      });

      return newFriendRequest
        .save()
        .then(friendRequest => res.json(friendRequest))
        .catch(console.error);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   POST friend-request/respond
 * @desc    Respond to friend request
 * @access  Private
 */
router.post(
  '/respond',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;

      const status = req.body.response;
      const requestId = req.body.requestId;

      const friendRequest = await FriendRequest.findById({ _id: requestId }).exec();

      if (user._id.toHexString() !== friendRequest.receiver.toHexString()) {
        return res.sendStatus(400);
      }

      friendRequest.status = status;

      // Declined
      if (friendRequest.status === 2) {
        return res.json({ msg: 'Friend request declined' });
      }

      const requester = await User.findById({ _id: friendRequest.requester }).exec();

      const receiver = await User.findById({ _id: user._id }).exec();
      console.log(receiver);
      console.log(requester);

      // Accepted
      receiver.friendsList.push(friendRequest.requester);
      requester.friendsList.push(friendRequest.receiver);

      friendRequest.save();
      receiver.save();
      requester.save();

      return res.status(200).json({ msg: 'yee' });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
