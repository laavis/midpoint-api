import * as mongoose from 'mongoose';

export interface ILocationRequest {
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
}

const LocationRequestSchema = new mongoose.Schema({
  requester: mongoose.Types.ObjectId,
  receiver: mongoose.Types.ObjectId,
  status: Number,
  requesterLat: String,
  requesterLng: String,
  recieverLat: String,
  recieverLng: String,
  meetingPointLat: String,
  meetingPointLng: String,
});

const LocationRequest = mongoose.model<ILocationRequest & mongoose.Document>('LocationRequest', LocationRequestSchema);

export default LocationRequest;
