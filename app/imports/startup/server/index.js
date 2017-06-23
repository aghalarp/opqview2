import { Meteor } from 'meteor/meteor';
import '../../api/measurements/measurementsPublications.js';
import '../../api/simulatedEvents/simulatedEventsPublications';
import { startEventSimulation } from '../../api/simulatedEvents/simulatedEventsMethods';

const simHandle = startEventSimulation();

Meteor.setTimeout(() => {
  Meteor.clearInterval(simHandle);
  console.log('Event simulation stopped!');
}, 60000 * 60);
