import { Meteor } from 'meteor/meteor';
import Measurements from './measurements.js';

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
  },
  getActiveDeviceIds(startTimeMs = Date.now() - (60 * 1000)) {
    if (Meteor.isServer) {
      check(startTimeMs, Number);

      const measurements = Measurements.find({timestamp_ms: {$gte: startTimeMs}}, {fields: {device_id: 1}}).fetch();

      // Returns an array of unique deviceIds, sorted asc.
      return (measurements.length > 0) ? _.uniq(_.pluck(measurements, 'device_id')).sort((a, b) => a - b) : null;
    }
  }
});