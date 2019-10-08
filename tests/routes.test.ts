import mongoose, { mongo } from 'mongoose';
import request from 'supertest'; // supertest is used for testing api endpoints. 

import {expect} from 'chai';
import 'mocha';

import app from '../src/app';

import Night, {NightDocument} from '../src/models/Night';
import {convertToJSDate, populateWeek, INightRecord, NightRecord} from '../shared/model'
import { completeNight } from '../shared/sampledata';
import { DateTime } from 'luxon';

const dbName = 'sleepTestDB';
const dburl = `mongodb://localhost:27017/${dbName}`;

/*
Hi Ali, 
I haven't talked to you in a while, but I graduated university a little while ago, 
and I'm looking at finding work in Toronto. 
*/

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
      // I think it converts to json automatically. This is just sending a string. 
      // yeah, that was basically the problem I think. Weird. 
      // .send(JSON.stringify(completeNight))
      .send(completeNight)
      .expect(200);
    // expect(res.status).to.equal(200);
  })

  it ('adds night to database if not already there', async function  () {
    const res = await request(app)
      .put('/api/nights')
      .send(completeNight)
      .expect(200);
    try {
      let doc: NightDocument = (await Night.findOne() as NightDocument); // find the one document.
      expect(doc).not.to.be.null;
      expect(doc.toObject()).to.eql(convertToJSDate(completeNight));
    } catch (e) {
      console.log(e);
      throw e;
    }
  });

  it ('replaces a document at the same date', async function () {
    let dt = DateTime.fromObject({year: 2005, month: 8, day: 22});
    const initialNight = new NightRecord(dt);
    const updated = completeNight;
    let addedDoc: NightDocument;
    let addedID: number;
    let completeNight2 = NightRecord.fromNightRecord(completeNight);
    completeNight2.dateAwake = dt;
    try {
      addedDoc = await new Night(initialNight.toDBFormat()).save();
      expect(addedDoc).to.be.instanceOf(Night);
      addedID = addedDoc.id;
    } catch (e) {
      console.log(`test night failed to save to database: ${e}`);
      throw e;
    }
    const res = await request(app)
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
    // console.log(`preupdate ID ${addedID}`);
    // console.log(`postupdate ID ${updatedDoc.id}`)
    expect(updatedDoc.interuptions[0].duration).to.equal('PT3H');

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
        week = populateWeek(night);
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
    let nightstr = nights[0].dateAwake.toISO();
    const url = `/api/nights/${nightstr}`;
    let n: request.Response = await request(app)
      .get(url).expect('Content-Type', /json/).expect(200);

    expect(NightRecord.fromSerial(n.body)).to.eql(nights[0]);
  });

})


let nightInWeek = DateTime.fromObject({ year: 2002, month: 9, day: 3 });
console.log(nightInWeek.weekdayLong);
let start = nightInWeek.startOf('week'); // monday. 
let mon = new NightRecord(start);
mon.edited = true;
mon.gotUp = mon.dateAwake.plus({hours: 8});
let tues = new NightRecord(start.plus({ days: 1 }));
tues.edited = true;
tues.sleepQuality = '5';
let thurs = new NightRecord(tues.dateAwake.plus({ days: 2 }));
thurs.edited = true;
thurs.gotUp = thurs.dateAwake.plus({hours: 2});
let sun = new NightRecord(thurs.dateAwake.plus({days: 3}));
sun.edited = true;
sun.fellAsleepAt = sun.dateAwake.minus({hours: 2}); // 10 pm saturday night. 
let nights: NightRecord[] = [
  mon,
  tues,
  thurs,
  sun,
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

  it ('sends 404 if week not found in database', async function () {
    const someNight = DateTime.fromObject({year: 2012, month: 8, day: 15});
    const url = `/api/weeks/${someNight.toISO()}`;
     await request(app).get(url).expect(404);
  });

  it ('sends partial week if not all days defined', async function () {
    const url = `/api/weeks/${nightInWeek.toISO()}`;
    let w = await request(app)
      .get(url)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(Array.isArray(w.body)).to.be.true;
    expect(w.body.length).to.equal(4);
    expect(NightRecord.fromSerial(w.body[0])).to.eql(mon);
    expect(NightRecord.fromSerial(w.body[1])).to.eql(tues);
    expect(NightRecord.fromSerial(w.body[2])).to.eql(thurs);
    expect(NightRecord.fromSerial(w.body[3])).to.eql(sun);
  });
});
