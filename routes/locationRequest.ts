import { Router, Request, Response, NextFunction, request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import User, { IUser } from '../models/User';
import LocationRequest from '../models/LocationRequest';
import { resolveSoa } from 'dns';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'LocationRequest works' }));

/**
 * @route   POST location-request/request
 * @desc    Send location request with user id
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

      const newLocationRequest = new LocationRequest({
        requester: requester._id,
        receiver: receiver._id,
        status: 0,
        requesterLat: lat,
        requesterLng: lng
      });

      return newLocationRequest
        .save()
        .then(LocationRequest => res.json(LocationRequest))
        .catch(console.error);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   POST location-request/respond
 * @desc    Respond to location request
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

      const locationRequest = await LocationRequest.findById({ _id: requestId }).exec();

      if (user._id.toHexString() !== locationRequest.receiver.toHexString()) {
        return res.sendStatus(400);
      }

      // location of the reciever
      const lat = req.body.lat
      const lng = req.body.lng
      if (!lat || !lng) res.status(400).json('Missing lat or lng')

      // midpoint
      const midLat = req.body.middleLat
      const midLng = req.body.middleLng
      if (!lat || !lng) res.status(400).json('Missing middleLat or middleLng')

      locationRequest.status = status;
      if (locationRequest.status === 0) return res.json('Missing response code')
      // Declined
      if (locationRequest.status === 2) {
        return res.json({ msg: 'location request declined' });
      }

      locationRequest.recieverLat = lat
      locationRequest.recieverLng = lng
      locationRequest.meetingPointLat = midLat
      locationRequest.meetingPointLng = midLng

      const requester = await User.findById({ _id: locationRequest.requester }).exec();

      const receiver = await User.findById({ _id: user._id }).exec();
      console.log(receiver);
      console.log(requester);

      // Accepted

      locationRequest.save();
      return res.status(200).json({ msg: 'Request accepted' });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET location-request/outgoing
 * @desc    Get list of all outgoing location requests
 * @access  Private
 */
router.get('/outgoing', passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all outgoing location requests
      const outgoingRequests = await LocationRequest.find({ requester: user._id }).exec()
      return res.status(200).json({ outgoingRequests });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   GET location-request/incoming
 * @desc    Get list of all incoming location requests
 * @access  Private
 */
router.get('/incoming', passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending incoming location requests
      const incomingRequests = await LocationRequest.find({ receiver: user._id }).exec()
      return res.status(200).json({ incomingRequests });
    } catch (e) {
      next(e);
    }
  }
);


/**
 * @route   GET location-request/all
 * @desc    Get list of all location requests of the current user
 * @access  Private
 */
router.get('/all', passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      // Get all pending incoming location requests
      const requests = await LocationRequest.find({$or:[{receiver: user._id},{requester: user._id}]}).exec()
      return res.status(200).json({ requests });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
