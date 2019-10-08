import mongoose from 'mongoose';
import app from './app';

// constants
const port = 5000;
const dbName = 'mySleepDB';
// const dbName='josephSleepDB';
const dburl = `mongodb://localhost:27017/${dbName}`;

// connect to mongoDB, and start the app when it completes.
mongoose.connect(dburl, { useNewUrlParser: true }).then(() => {
  app.listen(port, () => console.log(`App listening on port ${port}!`));
}).catch((error => {
  console.log(`Mongoose initial connection error occured: ${error}`);
}));

// this event listener is for handling errors after initial connection. 
// https://mongoosejs.com/docs/connections.html
mongoose.connection.on('error', err => {
  console.log(`Mongoose error occured after connection ${err}`);
});