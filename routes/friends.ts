import { Router, Request, Response, NextFunction, request } from 'express';
import * as passport from 'passport';
import * as admin from 'firebase-admin';
import User, { IUser } from '../models/User';
import FriendToken, { IFriendToken } from '../models/FriendToken';
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
  const incomingFriendRequests = await FriendRequest.find({ receiver: user._id, status: 0 }).exec();
  const sentFriendRequests = await FriendRequest.find({ requester: user._id, status: 0 }).exec();
  const receivedRequests = [];
  const sentRequests = [];
  const friends = [];

  for (const request of incomingFriendRequests) {
    const copy = {} as any;
    copy._id = request._id;
    copy.requester = request.requester;
    copy.receiver = request.receiver;
    copy.status = request.status;
    const user = await User.findById(request.requester, { username: 1 }).exec();
    copy.requester_username = user.username;
    receivedRequests.push(copy);
  }

  for (const request of sentFriendRequests) {
    const copy = {} as any;
    copy._id = request._id;
    copy.requester = request.requester;
    copy.receiver = request.receiver;
    copy.status = request.status;
    const user = await User.findById(request.receiver, { username: 1 }).exec();
    copy.receiver_username = user.username;
    sentRequests.push(copy);
  }

  for (const userId of user.friendsList) {
    const friend = await User.findById(userId, { username: 1 }).exec();
    friends.push(friend);
  }

  res.json({
    received_requests: receivedRequests,
    sent_requests: sentRequests,
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

      if (!receiver) return res.json('User not found');

      const registrationToken = receiver.firebaseToken;

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

      if (registrationToken) {
        var message = {
          data: {
            friendRequest: JSON.stringify(newFriendRequest)
          },
          notification: {
            body: `${requester.username} sent you a friend request`,
            title: 'Midpoint'
          },
          token: registrationToken
        };

        // Send a message to the device corresponding to the provided
        // registration token.
        admin
          .messaging()
          .send(message)
          .then(response => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
          })
          .catch(error => {
            console.log('Error sending message:', error);
          });
      }

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

      const friendRequest = await FriendRequest.findById({ _id: requestId }).exec();

      if (user._id.toHexString() !== friendRequest.receiver.toHexString()) {
        return res.json({ success: false });
      }

      friendRequest.status = status;

      const requester = await User.findById({ _id: friendRequest.requester }).exec();
      const receiver = await User.findById({ _id: user._id }).exec();
      const registrationToken = requester.firebaseToken;

      let message;

      // Declined
      if (friendRequest.status === 2) {
        await FriendRequest.findByIdAndDelete({ _id: requestId }).exec();

        message = {
          notification: {
            body: `${receiver.username} denied your friend request`,
            title: 'Midpoint'
          },
          token: registrationToken || null
        };

        return res.json({
          success: true,
          msg: 'Friend request declined'
        });
      }

      message = {
        notification: {
          body: `${receiver.username} accepted your friend request!`,
          title: 'Midpoint'
        },
        token: registrationToken || null
      };

      if (registrationToken) {
        const msg = message;

        // Send a message to the device corresponding to the provided
        // registration token.
        admin
          .messaging()
          .send(msg)
          .then(response => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
          })
          .catch(error => {
            console.log('Error sending message:', error);
          });
      }

      receiver.friendsList.push(friendRequest.requester);
      requester.friendsList.push(friendRequest.receiver);

      await friendRequest.save();
      await receiver.save();
      await requester.save();

      return res.json({
        success: true
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   POST friend-request/respond
 * @desc    Delete friend
 * @access  Private
 */
router.post(
  '/delete',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;

      const friendUsername = req.body.friend_username;

      const remover = await User.findOne({ _id: user._id }).exec();
      const friendToBeRemoved = await User.findOne({ username: friendUsername }).exec();

      if (!remover || !friendToBeRemoved) return res.send({ error: 'Something went wrong' });

      const ftbrFriendList = friendToBeRemoved.friendsList;
      const userFriendList = remover.friendsList;

      // Remove user from friend's list
      const fIndex = ftbrFriendList.indexOf(user._id);
      if (fIndex > -1) ftbrFriendList.splice(fIndex, 1);

      // Remove friend from user's list
      const uIndex = userFriendList.indexOf(friendToBeRemoved._id);
      if (uIndex > -1) userFriendList.splice(uIndex, 1);

      await FriendRequest.findOneAndRemove({
        requester: user._id,
        receiver: friendToBeRemoved._id
      }).exec();

      await FriendRequest.findOneAndRemove({
        requester: friendToBeRemoved._id,
        receiver: user._id
      }).exec();

      await remover.save();
      await friendToBeRemoved.save();

      return res.json({ error: null });
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

router.get(
  '/qr/create',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;

      const token = await FriendToken.create({ requester: user._id, createdAt: new Date() });

      return res.send({ token: token._id });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/qr/redeem',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;

      const token = await FriendToken.findById(req.body.token).exec();
      if (!token) return res.send({ error: 'Invalid friend request' });

      if (user._id.toHexString() === token.requester.toHexString()) {
        return res.send({ error: 'You cannot add yourself as friend :(' });
      }

      await FriendToken.findByIdAndRemove(token._id).exec();

      const requester = await User.findById({ _id: token.requester }).exec();
      const receiver = await User.findById({ _id: user._id }).exec();

      if (!receiver.friendsList.includes(requester._id)) {
        receiver.friendsList.push(requester._id);
      } else {
        return res.send({ error: `You are already friends with ${requester.username}` });
      }

      if (!requester.friendsList.includes(receiver._id)) {
        requester.friendsList.push(receiver._id);
      }

      await receiver.save();
      await requester.save();

      return res.send({
        requester_username: requester.username
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
