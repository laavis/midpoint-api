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
  timestamp: { type: Date, default: Date.now }
});

const MeetingRequest = mongoose.model<IMeetingRequest & mongoose.Document>('MeetingRequest', MeetingRequestSchema);

export default MeetingRequest;
