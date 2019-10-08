import express from 'express';
import mongoose from 'mongoose';
import { IBaseNightRecord, DrugRecord, NightRecord } from '../shared/model';

import { DateTime } from 'luxon';
const app = express();
app.use(express.json());
// app.use(express.urlencoded);

import Night from './models/Night';

export function deserializeForMongoSchema(start: IBaseNightRecord<string, string>) {
  let out: Partial<IBaseNightRecord<Date, string>> = {};
  out.edited = start.edited;
  out.dateAwake = DateTime.fromISO(start.dateAwake).toJSDate();
  if (start.bedTime)
    out.bedTime = DateTime.fromISO(start.bedTime).toJSDate();
  if (start.fellAsleepAt)
    out.fellAsleepAt = DateTime.fromISO(start.fellAsleepAt).toJSDate();
  out.interuptions = start.interuptions;
  if (start.wokeUp) {
    out.wokeUp = DateTime.fromISO(start.wokeUp).toJSDate();
  }
  if (start.gotUp) {
    out.gotUp = DateTime.fromISO(start.gotUp).toJSDate();
  }
  out.restedRating = start.restedRating;
  out.sleepQuality = start.sleepQuality;
  out.medsAndAlcohol = start.medsAndAlcohol.map(({ substance, time, quantity }) => {
    if (time) {
      return { substance, time: DateTime.fromISO(time).toJSDate(), quantity };
    }
    return { substance, time: null, quantity };
  });
  return (out as IBaseNightRecord<Date, string>);
}

/*
I need to add an analytics route to the backend thing for the database that queries one or more 
of the night object fields from the database (say, waking up time) for a range of dates and 
sends them to be graphed on the front end, with d3 or something. 
*/

app.get('/api/analytics/:property', async (req, res) => {
  // query parameters will be in req.query. 
  let start = DateTime.fromISO(req.query.start);
  let end = DateTime.fromISO(req.query.end);
  console.log()
  try {
    let q = Night.find({
      dateAwake: {
        $gte: start.toJSDate(),
        $lt: end.toJSDate()
      },
      [req.params.property]: {
        $exists: true,
      }
    }).select(`${req.params.property} dateAwake`).lean();
    // let data = await Night.find({dateAwake: {$gte: start.toJSDate(), $lt: end.toJSDate()}})
    let data = await q.exec();
    console.log(data);
    res.send(data);

  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
})


app.get('/api/night', async (req, res) => {
  let n;
  try {
    n = await Night.findOne().lean();
    delete n._id;
    console.log(n);
    if (n === null) {
      res.status(404).send("night not found");
    } else {
      res.send(n);
    }
  } catch (e) {
    console.log(`Night.findOne failed: ${e}`);
    // if results===null, then it means that nothing was found, but that doesn't
    // imply an error. results and error will be null in that case. 
    res.status(500).send("database error occured");
  }
});

/**
 * Get the night with dateAwake in ISO format as the url parameter. 
 */
app.get('/api/nights/:dateAwake', async (req, res) => {
  const date = DateTime.fromISO(req.params.dateAwake).toJSDate();
  try {
    const doc = await Night.findOne({ dateAwake: { $eq: date } }).lean();
    // console.log(doc);
    if (doc) {
      delete doc._id;
      delete doc.__v;
      res.send(doc);
    } else {
      res.sendStatus(404);
    }
  } catch (e) {
    console.log(`error occured: ${e}`);
    res.sendStatus(500);
  }
});

// https://expressjs.com/en/4x/api.html#req.body
// so request.body is by default unpopulated. Need to use a middleware, such as
// the express JSON middleware to populate it. Middleware is defined at the top level.
// otherwise req is undefined.
app.put('/api/nights', async (req, res) => {

  let nightrec = NightRecord.fromSerial(req.body).toDBFormat();
  let mposted = new Night(nightrec);
  // I need also need to make sure there is only one document with dateAwake.
  // I can use findAndUpdate with upsert = true. 
  try {
    await (Night as any).findOneAndReplace({
      dateAwake: nightrec.dateAwake,
    },
      nightrec, { upsert: true });
    res.sendStatus(200);
  } catch (e) {
    console.log(`db error occured at PUT /api/night: ${e}`);
    res.sendStatus(500);
  }
  // mposted.save((err, product) => {
  //   if (err) {
  //     console.log(err)
  //     res.sendStatus(500);
  //   } else {
  //     res.sendStatus(202);
  //   }
  // });
});

app.get('/api/priorsubstances', (req, res) => {
  mongoose.connection.collection('priorSubstances').find({}).toArray().then(arr => {
    console.log('sending prior substances');
    // strip out the _id
    res.send((arr as DrugRecord[]).map(({ substance, time, quantity }) => {
      return { substance, time, quantity };
    }));
  })
});

// I think this will work!
app.get('/api/weeks/:weekOf', async (req, res) => {
  // Basically here try and query a range of dates. 
  // Week can be any day in the week and it will find the start and end of the week. 
  const dayInWeek = DateTime.fromISO(req.params.weekOf);
  const queryStart = dayInWeek.startOf('week').minus({ hours: 8 });
  const queryEnd = dayInWeek.endOf('week');
  try {
    let nights = await Night.find(
      { dateAwake: { $gt: queryStart.toJSDate(), $lt: queryEnd.toJSDate() } }).lean();
    // const results = nights.map(nd => nd.toObject());
    if (nights.length > 0) {
      res.send(nights);
    } else {
      res.sendStatus(404);
    }
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.get('/api/clear', async (req, res) => {
  try {
    await Night.deleteMany({});
    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
})

export default app;