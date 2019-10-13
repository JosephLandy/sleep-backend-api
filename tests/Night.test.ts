import { expect } from 'chai';
import 'mocha';

import Night from '../src/models/Night';
import mongoose from 'mongoose';
import {completeNight} from '../shared/sampledata';
import { INightRecord, NightRecord } from '../shared/model';
// import { INightRecordJSDate, convertToJSDate } from '../shared/model';
const dbName = 'sleepTestDB';
const dburl = `mongodb://localhost:27017/${dbName}`;

// const nightJSDate = convertToJSDate(completeNight);
const nightJSON = JSON.stringify(completeNight);



describe ('Night model', function () {
  before(function (done) {
    mongoose.connect(dburl, { useNewUrlParser: true })
      .then(() => {
        Night.remove({}, (err: any) => {
          if (err) console.log(`error occured clearing nights from database`);
          done();
        })
      }).catch((error => {
        console.log(`Mongoose initial connection error occured: ${error}`);
      }))
  });

  after(function (done) {
    mongoose.disconnect().then(() => {
      done();
    }).catch(error => {
      console.log(`mongoose disconnection error: ${error}`);
    })
  });

  describe('#new', function() {
    it('should not fail for INightRecord', function () { // fail
      
      let inrDoc = new Night(completeNight);
      // console.log(inrDoc);
      // new Night(completeNight);
      // using a completeNight converts to model absolutely fine. It's perfect.
      expect(() => new Night(completeNight)).to.not.throw();
    });

    it('should fail for JSON', function() { // pass
      expect(() => new Night(nightJSON)).to.throw();
    });

    it('should succeed for INightRecordDB', function() { // pass
      expect(() => new Night(completeNight)).to.not.throw;
    });

    it ('should not fail for NightRecord class', function () {
      const NRInstance = NightRecord.fromNightRecord(completeNight);
      expect(() => new Night(NRInstance)).to.not.throw;

    });
  });


  
  describe('#toObject', function () {
    before(function (done) {
      Night.remove({}, (err: any) => {
        if (err) console.log(`error occured clearing nights from database`);
        done();
      });
    });
    after(function (done) {
      Night.remove({}, (err: any) => {
        if (err) console.log(`error occured clearing nights from database`);
        done();
      });
    });
    
    it('should omit _id and __v from root', async function () {
      const n = new Night(completeNight);
      await n.save();
      let night = await Night.findOne({});
      night = (night as mongoose.Document & INightRecord);
      expect(night.toObject()).not.to.have.property('_id');
      expect(night.toObject()).not.to.have.property('__v');
    });
    it('should omit _id and __v from subdocuments', async function () {
      const n = new Night(completeNight);
      let obj: INightRecord = n.toObject();
      expect(obj.interuptions[0]).not.to.have.property('_id');
      expect(obj.interuptions[0]).not.to.have.property('__v');
    });
  });

})

