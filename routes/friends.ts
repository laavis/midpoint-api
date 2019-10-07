import { Router, Request, Response, NextFunction, request } from 'express';
import * as passport from 'passport';
import User, { IUser } from '../models/User';
import FriendRequest from '../models/FriendRequest';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'FriendRequest works' }));

/**
 * @route   GET friends/friendlist
 * @desc    Get current users friend list
 * @access  Private
 */
router.get('/list', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response) => {
  const user = req.user as IUser;

  // Get all pending incoming friend requests
  const incomingRequests = await FriendRequest.find({ receiver: user._id, status: 0 }).exec();
  const requests = [];

  for (const request of incomingRequests) {
    const copy = {} as any;
    copy._id = request._id;
    copy.requester = request.requester;
    copy.receiver = request.receiver;
    copy.status = request.status;
    const user = await User.findById(request.requester, { username: 1 }).exec();
    copy.requester_username = user.username;
    requests.push(copy);
  }

  const friends = [];
  for (const userId of user.friendsList) {
    const friend = await User.findById(userId, { username: 1 }).exec();
    friends.push(friend);
  }

  res.json({
    requests,
    friends
  });
});

/**
 * @route   POST friends/request
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

      if (!receiver) res.json('User not found');

      const friendRequest = await FriendRequest.findOne({
        requester: requester._id,
        receiver: receiver._id
      }).exec();

      if (friendRequest) {
        return res.json({ msg: 'exists' });
      }

      const newFriendRequest = new FriendRequest({
        success: true,
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

      const status = req.body.status;
      const requestId = req.body.request_id;

      console.log(status, requestId);

      const friendRequest = await FriendRequest.findById({ _id: requestId }).exec();

      if (user._id.toHexString() !== friendRequest.receiver.toHexString()) {
        return res.sendStatus(400);
      }

      friendRequest.status = status;

      console.log(friendRequest);

      // Declined
      if (friendRequest.status === 2) {
        FriendRequest.findByIdAndDelete({ _id: requestId }).exec();
        console.log(friendRequest);

        return res.json({
          success: true,
          msg: 'Friend request declined'
        });
      }

      const requester = await User.findById({ _id: friendRequest.requester }).exec();
      const receiver = await User.findById({ _id: user._id }).exec();

      receiver.friendsList.push(friendRequest.requester);
      requester.friendsList.push(friendRequest.receiver);

      friendRequest.save();
      receiver.save();
      requester.save();

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET friend-request/outgoing
 * @desc    Get list of all outgoing friend requests without a response
 * @access  Private
 */
router.get(
  '/outgoing',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending outgoing friend requests
      const outgoingRequests = await FriendRequest.find({ requester: user._id, status: 0 }).exec();
      const requests = [];
      for (const request of outgoingRequests) {
        const copy = {} as any;
        copy._id = request._id;
        copy.requester = request.requester;
        copy.receiver = request.receiver;
        copy.status = request.status;
        const user = await User.findById(request.receiver, { username: 1 }).exec();
        copy.receiverUsername = user.username;
        requests.push(copy);
      }
      return res.status(200).json({ requests });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET friend-request/incoming
 * @desc    Get list of all incoming friend requests without a response
 * @access  Private
 */
router.get(
  '/incoming',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending incoming friend requests
      const incomingRequests = await FriendRequest.find({ receiver: user._id, status: 0 }).exec();
      const requests = [];
      for (const request of incomingRequests) {
        const copy = {} as any;
        copy._id = request._id;
        copy.requester = request.requester;
        copy.receiver = request.receiver;
        copy.status = request.status;
        const user = await User.findById(request.requester, { username: 1 }).exec();
        copy.requester_username = user.username;
        requests.push(copy);
      }
      return res.json({ requests });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
