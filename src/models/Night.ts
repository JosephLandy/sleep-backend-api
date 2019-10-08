import mongoose, { Schema } from 'mongoose';
import { INightRecordJSDate, IBaseNightRecord, DrugRecord, INightRecord, IntRecord } from '../../shared/model';

export type NightDocument = INightRecordJSDate & mongoose.Document;

// https://mongoosejs.com/docs/guide.html#_id lets me define child documents (like in medsAndAlcohol etc)
// as not having an _id. 
type IntType = { duration: string, notes: string }
const interuptionsSchema = new Schema<IntRecord>(
{
    duration: String,
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

const nightSchema = new Schema<INightRecordJSDate>({
  edited: { type: Boolean, required: true },
  // day: { type: String, required: true },
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
  toObject: {
    versionKey: false,
    transform: (doc, ret: INightRecordJSDate & {_id: any}) => {
      delete ret._id;
      return ret;
    }
  },
  toJSON: {
    versionKey: false,
    transform: (doc, ret: INightRecordJSDate & { _id: any}) => {
      delete ret._id;
      return ret;
    }
  }
});

// nightSchema.virtual('INightRecord').get(function () {
//   // set the schema from
// }).set(function (nr: INightRecord) {
// });
// nightSchema.statics.fromNightRecord = function(nr: INightRecord) {
// }

export default mongoose.model<NightDocument>('Night', nightSchema);