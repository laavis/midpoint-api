import * as mongoose from 'mongoose';

export interface IMeetingRequest {
  _id: mongoose.Types.ObjectId;
  requester: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: number;
  requesterLat: string;
  requesterLng: string;
  recieverLat: string;
  recieverLng: string;
  meetingPointLat: string;
  meetingPointLng: string;
  meetingPointName: string;
  timestamp: Date;
  requesterArrived: boolean;
  receiverArrived: boolean;
}

const MeetingRequestSchema = new mongoose.Schema({
  requester: mongoose.Types.ObjectId,
  receiver: mongoose.Types.ObjectId,
  status: Number,
  requesterLat: String,
  requesterLng: String,
  recieverLat: String,
  recieverLng: String,
  meetingPointLat: String,
  meetingPointLng: String,
  meetingPointName: String,
  timestamp: { type: Date, default: Date.now },
  requesterArrived: { type: Boolean, default: false },
  receiverArrived: { type: Boolean, default: false },
});

export enum MeetingRequestStatus {
  NO_RESPONSE = 0,
  ACCEPTED = 1,
  REJECTED = 2,
  ACCEPTED_SHOW_LOCATION = 3
}

const MeetingRequest = mongoose.model<IMeetingRequest & mongoose.Document>('MeetingRequest', MeetingRequestSchema);

export default MeetingRequest;
