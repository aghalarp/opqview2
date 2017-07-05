import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Measurements } from './measurements.js';

export const getActiveDeviceIdsVM = new ValidatedMethod({
  name: 'Measurements.getActiveDeviceIds',
  validate: new SimpleSchema({
    startTimeMs: {type: Number}
  }).validator({clean: true}),
  run({ startTimeMs }) {
    const recentMeasurements = Measurements.find({timestamp_ms: {$gte: startTimeMs}}, {fields: {device_id: 1}}).fetch();

    // Returns an array of unique deviceIds, sorted asc.
    return (recentMeasurements.length > 0) ? _.uniq(_.pluck(recentMeasurements, 'device_id')).sort((a, b) => a - b) : null;
  }
});