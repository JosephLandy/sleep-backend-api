import mongoose, { mongo } from 'mongoose';
import request from 'supertest'; // supertest is used for testing api endpoints. 

import {expect} from 'chai';
import 'mocha';

import app from '../src/app';

import Night, {NightDocument} from '../src/models/Night';
import {populateWeek, INightRecord, NightRecord} from '../shared/model'
import { completeNight } from '../shared/sampledata';
import { DateTime } from 'luxon';

import {addHours, subHours, addDays, startOfWeek, isMonday, isTuesday, isWednesday, 
  isThursday, isFriday, isSaturday, isSunday, format} from 'date-fns';

const dbName = 'sleepTestDB';
const dburl = `mongodb://localhost:27017/${dbName}`;

describe('PUT  /api/nights', function () {

  beforeEach(function (done) {
    mongoose.connect(dburl, { useNewUrlParser: true })
      .then(() => {
        Night.remove({}, (err: any) => {
          if (err) console.log(`error occured clearing nights from database`);
          done();
        })
      }).catch((error => {
        console.log(`Mongoose initial connection error occured: ${error}`);
        throw error;
      }))
  });

  afterEach(function (done) {
    mongoose.disconnect().then(() => {
      done();
    }).catch(err => {
      console.log(`mongoose disconnection error: ${err}`);
    })
  });

  it ('returns status 202 if valid night sent', async function () {
    const res = await request(app)
      .put('/api/nights')
      .send(completeNight)
      .expect(200);
  })

  it ('adds night to database if not already there', async function  () {
    await request(app)
      .put('/api/nights')
      .send(completeNight)
      .expect(200);
    let doc: NightDocument;
    try {
      doc = (await Night.findOne() as NightDocument);
    } catch (e) {
      console.log(e);
      throw e;
    }
    expect(doc.toObject()).to.eql(completeNight);
  });

  it ('replaces a document at the same date', async function () {
    let dt = DateTime.fromObject({year: 2005, month: 8, day: 22});
    const initialNight = new NightRecord(dt.toJSDate());
    let addedDoc: NightDocument;
    let addedID: number;
    let completeNight2 = NightRecord.fromNightRecord(completeNight);
    completeNight2.dateAwake = dt.toJSDate();
    try {
      addedDoc = await new Night(initialNight).save();
      addedID = addedDoc.id;
    } catch (e) {
      console.log(`test night failed to save to database: ${e}`);
      throw e;
    }
    await request(app)
      .put('/api/nights')
      .send(completeNight2)
      .expect(200);
    expect(await Night.countDocuments()).to.equal(1);
    let updatedDoc: NightDocument;
    try {
      updatedDoc = (await Night.findOne() as NightDocument);
    } catch (e) {
      throw e;
    }
    expect(updatedDoc.dateAwake.getTime()).to.equal(addedDoc.dateAwake.getTime());
    expect(addedID).to.equal(updatedDoc.id);
    expect(updatedDoc.interuptions[0].duration).to.equal(completeNight2.interuptions[0].duration);

  });

})

describe('GET /api/nights/:dateAwake', function () {
  let night = DateTime.fromObject({ year: 2002, month: 9, day: 3 });
  let week;
  let nights: INightRecord[];
  before(function (done) {
    mongoose.connect(dburl, { useNewUrlParser: true })
      .then(async () => {
        await Night.remove({});
      })
      .then(async () => {
        week = populateWeek(night.toJSDate());
        nights = Object.entries(week.nights).map(val => {
          val[1].edited = true; 
          return val[1];
          // return convertToJSDate(val[1]);
        });
        try {
          await Night.insertMany(nights);
          done();
        } catch (e) {
          throw e;
        };
      })
      .catch((error => {
        console.log(`Mongoose initial connection error occured: ${error}`);
      }))
  });

  after(async function () {
    try {
      await Night.remove({});
      await mongoose.disconnect();
    } catch (err) {
      throw err;
    }
  });

  it('sends 404 if night not found', async function () {
    let nightstr = DateTime.fromObject({year: 1999, month: 8, day: 10}).toISO();
    const url = `/api/nights/${nightstr}`;
    await request(app).get(url).expect(404);
  });

  it ('sends night if night in DB', async function() {
    let nightstr = nights[0].dateAwake.toISOString();
    const url = `/api/nights/${nightstr}`;
    let n: request.Response = await request(app)
      .get(url).expect('Content-Type', /json/).expect(200);

    expect(NightRecord.fromSerial(n.body)).to.eql(nights[0]);
  });

})


// I should save this as a shared sample week.
let nightInWeek = new Date(2002, 9, 3);
let start = startOfWeek(nightInWeek);
let sun = new NightRecord(start);
sun.edited = true;
sun.fellAsleepAt = subHours(sun.dateAwake, 2); // saturday night last week.
let mon = new NightRecord(addDays(start, 1));
mon.edited = true;
mon.gotUp = addHours(mon.dateAwake, 8);
let tues = new NightRecord(addDays(mon.dateAwake, 1));
tues.edited = true;
tues.sleepQuality = '5';
let thurs = new NightRecord(addDays(tues.dateAwake, 2));
thurs.edited = true;
thurs.gotUp = addHours(thurs.dateAwake, 2);
let nextsunday = new NightRecord(addDays(sun.dateAwake, 7));
let nights: NightRecord[] = [
  tues,
  mon,
  nextsunday,
  sun,
  thurs,
];

describe('GET /api/weeks/:weekOf', () => {
  before(function (done) {
    mongoose.connect(dburl, { useNewUrlParser: true })
      .then(async () => {
        await Night.remove({});
      })
      .then(async () => {
        await Night.insertMany(nights.map(n => new Night(n)));
        done();
      })
      .catch((error => {
        throw error;
      }))
  });
  after(async function () {
    try {
      await Night.remove({});
      await mongoose.disconnect();
    } catch (err) {
      throw err;
    }
  });

  it ('sends json response', async function() {
    const url = `/api/weeks/${nightInWeek.toISOString()}`;
    await request(app)
      .get(url)
      .expect(200)
      .expect('Content-Type', /json/);
  });

  it ('sends 404 if week not found in database', async function () {
    const someNight = DateTime.fromObject({year: 2012, month: 8, day: 15});
    const url = `/api/weeks/${someNight.toISO()}`;
    await request(app).get(url).expect(404);
  });

  // it ('dates of weekdays are as expected', async function () {
  //   const url = `/api/weeks/${nightInWeek.toISOString()}`;
  //   let w = await request(app)
  //     .get(url)
  //     .expect(200);
  //   console.log('sunday is sunday? ', isSunday(sun.dateAwake));
  //   w.body.forEach(n => {
  //     console.log(format(NightRecord.fromSerial(n).dateAwake, 'EEEE'));
  //   });

  //   expect(isSunday(NightRecord.fromSerial(w.body[0]).dateAwake)).to.be.true;
  // })

  // ok, problem is that startOfWeek is defined differently for datefns vs luxon. 
  // date-fns is probably better for north america (week starts on sunday. )
  it ('sends partial week if not all days defined', async function () {
    const url = `/api/weeks/${nightInWeek.toISOString()}`;
    let w = await request(app)
      .get(url)
      .expect(200);

    expect(Array.isArray(w.body)).to.be.true;
    expect(w.body.length).to.equal(4);
    expect(NightRecord.fromSerial(w.body[0])).to.eql(sun);
    expect(NightRecord.fromSerial(w.body[1])).to.eql(mon);
    expect(NightRecord.fromSerial(w.body[2])).to.eql(tues);
    expect(NightRecord.fromSerial(w.body[3])).to.eql(thurs);
  });
});
