import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

let Measurements;
if (Meteor.isServer) {
  //const OpqRemote = new MongoInternals.RemoteCollectionDriver('mongodb://127.0.0.1:9000/opq', {oplogUrl: 'mongodb://127.0.0.1:9000/local'});
  //const OpqRemote = new MongoInternals.RemoteCollectionDriver('mongodb://emilia.ics.hawaii.edu/opq');
  const OpqRemote = new MongoInternals.RemoteCollectionDriver('mongodb://localhost:3002/opq');
  Measurements = new Mongo.Collection('measurements', {idGeneration: 'MONGO', _driver: OpqRemote });
} else {
  Measurements = new Mongo.Collection('measurements', {idGeneration: 'MONGO'});
}

export default Measurements;
