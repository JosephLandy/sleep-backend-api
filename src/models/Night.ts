import mongoose, { Schema } from 'mongoose';
import {IBaseNightRecord, DrugRecord, INightRecord, IntRecord } from '../../shared/model';

export type NightDocument = INightRecord & mongoose.Document;

// https://mongoosejs.com/docs/guide.html#_id lets me define child documents (like in medsAndAlcohol etc)
// as not having an _id. 
type IntType = { duration: string, notes: string }
const interuptionsSchema = new Schema<IntRecord>(
{
    duration: Number,
    notes: String,
  },
  {
    _id: false,
  }
);
type MedsType = { substance: string, time: Date, quantity: number };
const medsAndAlcoholSchema = new Schema<MedsType>(
  {
    substance: String,
    time: Date, 
    quantity: Number,
  },
  {
    _id: false,
  }
);

const nightSchema = new Schema<INightRecord>({
  edited: { type: Boolean, required: true },
  dateAwake: { type: Date, required: true, unique: true },
  bedTime: { type: Date, required: false, },
  fellAsleepAt: { type: Date, required: false, },
  interuptions: [interuptionsSchema],
  wokeUp: Date,
  gotUp: Date,
  restedRating: String,
  sleepQuality: String,
  medsAndAlcohol: [medsAndAlcoholSchema],
  notes: String,
}, {
  // minimize: false,
  toObject: {
    versionKey: false,
    transform: (doc, ret: INightRecord & {_id: any}) => {
      delete ret._id;
      return ret;
    }
  },
  toJSON: {
    versionKey: false,
    transform: (doc, ret: INightRecord & { _id: any}) => {
      delete ret._id;
      return ret;
    }
  }
});

export default mongoose.model<NightDocument>('Night', nightSchema);