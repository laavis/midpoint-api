import { Router, Request, Response, NextFunction, request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import User, { IUser } from '../models/User';
import MeetingRequest from '../models/MeetingRequest';
import { resolveSoa } from 'dns';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'MeetingRequest works' }));

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
      if (!receiver) res.status(404).json('User not found');

      // location of the requester
      const lat = req.body.lat
      const lng = req.body.lng
      if (!lat || !lng) res.status(400).json('Missing lat or lng')

      const newMeetingRequest = new MeetingRequest({
        requester: requester._id,
        receiver: receiver._id,
        status: 0,
        requesterLat: lat,
        requesterLng: lng
      });

      return newMeetingRequest
        .save()
        .then(MeetingRequest => res.json(MeetingRequest))
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
        return res.json("Could not find request");
      }

      // location of the reciever
      const lat = req.body.lat;
      const lng = req.body.lng;
      if (!lat || !lng) res.status(401).json('Missing lat or lng');

      // midpoint
      const midLat = req.body.middleLat;
      const midLng = req.body.middleLng;
      if (!midLat || !midLng) res.status(402).json('Missing middleLat or middleLng');

      meetingRequest.status = status;
      if (meetingRequest.status === 0) return res.json('Missing response code')
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
      console.log(receiver);
      console.log(requester);

      // Accepted

      meetingRequest.save();
      return res.status(200).json({ msg: 'Request accepted' });
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
router.get('/outgoing', passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all outgoing meeting requests
      const outgoingRequests = await MeetingRequest.find({ requester: user._id }).exec()
      return res.status(200).json({ outgoingRequests });
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
router.get('/incoming', passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending incoming meeting requests
      const incomingRequests = await MeetingRequest.find({ receiver: user._id }).exec()
      return res.status(200).json({ incomingRequests });
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
router.get('/all', passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending incoming meeting requests
      var requests = await MeetingRequest.find({ $or: [{ receiver: user._id }, { requester: user._id }] }).exec();
      requests = requests as any;
      const response = []
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
          recieverLat: request.recieverLat,
          recieverLng: request.recieverLng
        };
        response.push(copy)
      }
      return res.status(200).json({ requests: response });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
