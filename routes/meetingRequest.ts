import { Router, Request, Response, NextFunction, request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import * as admin from 'firebase-admin';
import User, { IUser } from '../models/User';
import MeetingRequest from '../models/MeetingRequest';
import { resolveSoa } from 'dns';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'MeetingRequest works' }));

/**
 * STEP 1
 * Requester: req: username, lat, lng
 *
 * Step 2
 * Receiver: res: lat, lng, midpoint lat, midpoint lng, status code
 *
 * If accepted, calculate midpoint and send it to requester
 *
 * Step 3
 * Calculate route based on received midpoint
 *
 */

/**
 * @route   POST meeting-request/request
 * @desc    Send meeting request with user id
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
      console.log(receiver)
      console.log(requester)
      //if (!requester.friendsList.includes(receiver._id)) return res.json({ errors: 'Receiver is not your friend : (' });
      if (!receiver) return res.json({ errors: 'User not found' });

      // location of the requester
      const lat = req.body.lat;
      const lng = req.body.lng;
      if (!lat || !lng) return res.json({ errors: 'Missing lat or lng' });

      const newMeetingRequest = new MeetingRequest({
        requester: requester._id,
        receiver: receiver._id,
        status: 0,
        requesterLat: lat,
        requesterLng: lng
      });

      // This registration token comes from the client FCM SDKs.
      var registrationToken = receiver.firebaseToken;
      if (registrationToken) {
        var message = {
          data: {
            meetingRequest: JSON.stringify(newMeetingRequest),
          },
          notification: {
            body: `${requester.username} wants to meet`,
            title: 'Midpoint'
          },
          token: registrationToken
        };

        // Send a message to the device corresponding to the provided
        // registration token.
        admin.messaging().send(message)
          .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          })
      }
      return newMeetingRequest
        .save()
        .then(MeetingRequest => res.json({ msg: 'Request send successfully', MeetingRequest }))
        .catch(console.error);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   POST meeting-request/respond
 * @desc    Respond to meeting request
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

      const meetingRequest = await MeetingRequest.findById({ _id: requestId }).exec();

      if (user._id.toHexString() !== meetingRequest.receiver.toHexString()) {
        return res.json({ errors: 'Could not find request' });
      }

      // location of the reciever
      const lat = req.body.lat;
      const lng = req.body.lng;
      if (!lat || !lng) return res.json('Missing lat or lng');

      // midpoint
      const midLat = req.body.middleLat;
      const midLng = req.body.middleLng;
      if (!midLat || !midLng) return res.json({ errors: 'Missing middleLat or middleLng' });

      const meetingPointName = req.body.middlePointName;
      //if (!meetingPointName) return res.json({ errors: 'Missing meeting point name' })
      meetingRequest.status = status;
      if (meetingRequest.status === 0) return res.json({ errors: 'Missing response code' });
      // Declined
      if (meetingRequest.status === 2) {
        return res.json({ msg: 'meeting request declined' });
      }

      meetingRequest.recieverLat = lat;
      meetingRequest.recieverLng = lng;

      meetingRequest.meetingPointLat = midLat;
      meetingRequest.meetingPointLng = midLng;

      const requester = await User.findById({ _id: meetingRequest.requester }).exec();

      const receiver = await User.findById({ _id: user._id }).exec();
      // Accepted
      // This registration token comes from the client FCM SDKs.
      var registrationToken = requester.firebaseToken;
      if (registrationToken) {
        var message = {
          notification: {
            body: `${receiver.username} accepted your request!`,
            title: 'Midpoint'
          },
          token: registrationToken
        };

        // Send a message to the device corresponding to the provided
        // registration token.
        admin.messaging().send(message)
          .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          })
      }

      meetingRequest.save();
      return res.json({
        msg: 'ok',
        accepted: true,
        middlePointLat: midLat,
        middlePointLng: midLng,
        middlePointName: meetingPointName
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET meeting-request/delete
 * @desc    Deletes meeting request
 * @access  Private
 */
router.post('/delete', passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      const requestId = req.body.requestId;
      const meetingRequest = await MeetingRequest.findById({ _id: requestId }).exec();
      if (!meetingRequest.requester.equals(user._id)) {
        return res.json({ errors: 'No permission' })
      }
      await MeetingRequest.findByIdAndDelete({ _id: requestId }).exec();
      return res.json({ msg: 'Request deleted' });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET meeting-request/outgoing
 * @desc    Get list of all outgoing meeting requests
 * @access  Private
 */
router.get(
  '/outgoing',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all outgoing meeting requests
      const outgoingRequests = await MeetingRequest.find({ requester: user._id }).exec();
      return res.json({ outgoingRequests });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET meeting-request/incoming
 * @desc    Get list of all incoming meeting requests
 * @access  Private
 */
router.get(
  '/incoming',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending incoming meeting requests
      const incomingRequests = await MeetingRequest.find({ receiver: user._id }).exec();
      return res.json({ incomingRequests });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET meeting-request/all
 * @desc    Get list of all meeting requests of the current user
 * @access  Private
 */
router.get(
  '/all',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending incoming meeting requests
      var requests = await MeetingRequest.find({ $or: [{ receiver: user._id }, { requester: user._id }] }).exec();
      requests = requests as any;
      const response = [];
      for (const request of requests) {
        const receiver = await User.findById(request.receiver, { username: 1 }).exec();
        const requester = await User.findById(request.requester, { username: 1 }).exec();
        var copy = {
          _id: request._id,
          requester: request.requester,
          requesterUsername: requester.username,
          receiver: request.receiver,
          receiverUsername: receiver.username,
          status: request.status,
          requesterLat: request.requesterLat,
          requesterLng: request.requesterLng,
          __v: request.__v,
          meetingPointLat: request.meetingPointLat,
          meetingPointLng: request.meetingPointLng,
          meetingPointName: request.meetingPointName,
          recieverLat: request.recieverLat,
          recieverLng: request.recieverLng,
          timestamp: request.timestamp
        };
        response.push(copy);
      }
      return res.json({ requests: response });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
