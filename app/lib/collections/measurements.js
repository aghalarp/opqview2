if (Meteor.isServer) {
  //const OpqRemote = new MongoInternals.RemoteCollectionDriver('mongodb://127.0.0.1:9000/opq', {oplogUrl: 'mongodb://127.0.0.1:9000/local'});
  const OpqRemote = new MongoInternals.RemoteCollectionDriver('mongodb://127.0.0.1:3002/opq');
  Measurements = new Mongo.Collection('measurements', {idGeneration: 'MONGO', _driver: OpqRemote });
} else {
  Measurements = new Mongo.Collection('measurements', {idGeneration: 'MONGO'});
}

Meteor.methods({
  getSnapshot(startTime, stopTime = Date.now()) {
    const self = this;
    if (!self.isSimulation) {
      check(startTime, Number);
      check(stopTime, Number);

      const measurements = Measurements.find({timestamp_ms: {$gte: startTime, $lte: stopTime}}, {
        fields: {timestamp_ms: 1, voltage: 1, frequency: 1},
        reactive: false
      });

      console.log('measurements Size: ', measurements.count());

      const NUM_MEASUREMENTS_RETURN = 1000;

      // Math.trunc() simulates int division.
      const pickEveryN = Math.trunc((measurements.count() < NUM_MEASUREMENTS_RETURN) ? 1 : (measurements.count() / NUM_MEASUREMENTS_RETURN));

      /**
       * Since pickEveryN will usually be a floored value, the actual number of elements we return will be slightly
       * more than NUM_MEASUREMENTS_RETURN.
       */
      const filteredMeasurements = measurements.fetch().filter((measurement, index) => {
        return (index + 1) % pickEveryN === 0;
      });

      console.log('Reduced measurements size: ', filteredMeasurements.length);

      return filteredMeasurements;
    }
  }
});