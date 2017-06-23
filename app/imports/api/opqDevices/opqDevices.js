OpqDevices = new Mongo.Collection("opqDevices", {idGeneration: "MONGO"});

// Create and attach schema for this collection
OpqDevicesSchema = new SimpleSchema({
  deviceId: { // Note: Not a collection-related ID field. Actual device's ID from physical OPQBox.
    type: Number
  },
  locationId: { // Reference to Location. Many-to-One relationship.
    type: Mongo.ObjectID,
    optional: true
  },
  persons: { // Reference to Persons. Many-to-Many relationship.
    type: [Mongo.ObjectID],
    optional: true
  },
  accessKey: {
    type: String,
    label: "Access Key"
  },
  description: {
    type: String,
    label: "Description",
    optional: true
  },
  sharingData: {
    type: Boolean,
    label: "Share Data",
    optional: true
  },
  lastHeartbeat: { // Milliseconds from Epoch time.
    type: Number,
    optional: true
  }
});

OpqDevices.attachSchema(OpqDevicesSchema);


//import {getPersonId} from './persons.js';
import * as Person from '../persons/persons.js';
import { isUnusedEventLocation } from '../events/events.js';
//import {isUnusedDeviceLocation} from './opqDevices.js';
import ld from 'lodash';

Meteor.methods({
  saveDeviceConfiguration(deviceadminFormData) {
    if (Meteor.isServer) {
      const formData = deviceadminFormData;
      check(formData, Global.Schemas.DeviceadminForm); // This validates both OpqDevice and Location at same time.

      console.log('formData: ', formData);

      // Separate formData into Location and OpqDevice objects matching their schemas.
      const formLocation = ld.pick(formData, Locations.simpleSchema()._schemaKeys);
      console.log('form Location: ', formLocation);

      const formOpqDevice = ld.pick(formData, OpqDevices.simpleSchema()._schemaKeys);
      console.log('form OpqDevice: ', formOpqDevice);

      // Find OpqDevice, or throw error if does not exist.
      const device = OpqDevices.findOne({_id: new Mongo.ObjectID(formData.device_id)});
      if (!device) {
        throw new Meteor.Error('opqDevices.saveDeviceConfiguration.invalidDevice', 'Device does not exist.');
      }

      // Update OpqDevice. First ensure user has permissions/access to device before updating.
      const currUserId = Meteor.userId();
      const personId = Person.getPersonIdByUserId(currUserId);
      if (!device.persons.some(id => id.equals(personId))) {
        throw new Meteor.Error('opqDevices.saveDeviceConfiguration.opqDevicePermissionDenied', 'User does not have access to this OpqDevice');
      }

      // Update OpqDevice with form data.
      OpqDevices.update({_id: device._id}, {
        $set: formOpqDevice
      });


      // Update Location reference. First get existing location or create new location if no matching location for the
      // given gridId.
      let location = Locations.findOne({gridId: formData.gridId}); // Locations are uniquely identified by their gridId
      if (!location) {
        const newLocationId = Locations.insert(formLocation);
        location = Locations.findOne({_id: newLocationId});
        console.log(`New Location added: ${location}`);
      }

      // Update location reference on device.
      OpqDevices.update({_id: device._id}, {
        $set: {locationId: location._id}
      });

      // Remove old Location if not referenced by any other documents in any collection.
      const oldLocation = Locations.findOne({_id: new Mongo.ObjectID(formData.location_id)});

      const isUnusedDevice = isUnusedDeviceLocation(oldLocation._id);
      const isUnusedEvent = isUnusedEventLocation(oldLocation._id);
      const isUnusedPromises = Promise.all([isUnusedDevice, isUnusedEvent]);
      isUnusedPromises.then(results => {
        console.log('oldLocationId = ', oldLocation._id);
        console.log('isUnusedDevice = ', results[0]);
        console.log('isUnusedEvent = ', results[1]);
        if (results[0] && results[1]) {
          const removedId = Locations.remove({_id: oldLocation._id});
          console.log(`Location removed: ${removedId}`);
        }
      })
      .catch(err => {
        console.log(err);
      });

      return 'Device successfully updated.';
    }

  }
});


export const getPersons = (opqDevice_id) => {
  check(opqDevice_id, Mongo.ObjectID);
  const device = OpqDevices.findOne({_id: opqDevice_id});
  return (device) ? device.persons : null;
};

/**
 * Checks if given location_id exists for any OpqDevice. Useful for safe removal of unused Locations.
 * @param location_id - The Mongo id of the location.
 * @returns {boolean} - Returns true if location_id is not in use, false otherwise.
 */
export const isUnusedDeviceLocation = (location_id) => {
  check(location_id, Mongo.ObjectID);
  //const deviceCount = OpqDevices.find({locationId: location_id}).count();
  //return (deviceCount > 0) ? false : true;

  return new Promise((resolve, reject) => {
    OpqDevices.rawCollection().count({locationId: MongoInternals.NpmModule.ObjectID(location_id.toHexString())}, function(err, count) {
      if (err) {
        reject(err);
      }
      console.log('opqDevices Count: ', count);
      (count > 0) ? resolve(false) : resolve(true);
    });
  });
};

Global.QueryConstructors.publicOpqDevices = function(userId = Meteor.userId()) {
  const personCursor = Persons.find({userId: userId}, {fields: {userId: 1, opqDevices: 1}});
  const person = personCursor.fetch()[0]; // Should only be one document in array.

  if (person) {
    const userDevices = (person.opqDevices && person.opqDevices.length > 0) ? person.opqDevices : [];
    const opqDevicesSelector = {_id: {$nin: userDevices}};

    return {opqDevicesSelector, personCursor};
  }

  return {};
};

Global.QueryConstructors.userOpqDevices = function(userId = Meteor.userId()) {
  const personCursor = Persons.find({userId: userId}, {fields: {userId: 1, opqDevices: 1}});
  const person = personCursor.fetch()[0]; // Should only be one document in array.

  if (person) {
    const userDevices = (person.opqDevices && person.opqDevices.length > 0) ? person.opqDevices : [];
    const opqDevicesSelector = {_id: {$in: userDevices}};

    return {opqDevicesSelector, personCursor};
  }

  return {};
};

Global.QueryConstructors.opqDeviceWithLocation = function(deviceId, userId = Meteor.userId()) {
  // FlowRouter params are strings. Must parse to number for database query.
  deviceId = (typeof deviceId === 'string') ? Number(deviceId) : deviceId;
  check(deviceId, Number);

  const personCursor = Persons.find({userId: userId}, {fields: {userId: 1, opqDevices: 1}});
  const person = personCursor.fetch()[0];
  if (!person) throw new Meteor.Error('opqDevices.opqDeviceWithLocation.invalidUser', 'User does not exist.');

  const opqDeviceSelector = {deviceId: deviceId};
  const device = OpqDevices.findOne(opqDeviceSelector);
  if (!device) throw new Meteor.Error('opqDevices.opqDeviceWithLocation.invalidDevice', 'Device does not exist.');

  // Ensure user/person has access to given device.
  if ((!person.opqDevices) || (person.opqDevices && !person.opqDevices.some(deviceId => deviceId.equals(device._id)))) {
    throw new Meteor.Error('opqDevices.opqDeviceWithLocation.deviceAccessDenied', 'User does not have access to device.');
  }

  const locationCursor = Locations.find({_id: device.locationId});

  return {opqDeviceSelector, locationCursor, personCursor};
};

export const userHasDevice = (deviceId, userId = Meteor.userId()) => {

};

export const userHasDeviceGetCursors = (deviceId, userId = Meteor.userId()) => {
  // Ensure deviceId is of type Number.
  deviceId = (typeof deviceId === 'string') ? Number(deviceId) : deviceId;
  check(deviceId, Number);

  const personCursor = Persons.find({userId: userId}, {fields: {userId: 1, opqDevices: 1}});
  const person = personCursor.fetch()[0];
  if (!person) throw new Meteor.Error('opqDevices.opqDeviceWithLocation.invalidUser', 'User does not exist.');

  const opqDeviceSelector = {deviceId: deviceId};
  const device = OpqDevices.findOne(opqDeviceSelector);
  if (!device) throw new Meteor.Error('opqDevices.opqDeviceWithLocation.invalidDevice', 'Device does not exist.');

  // Ensure user/person has access to given device.
  if ((!person.opqDevices) || (person.opqDevices && !person.opqDevices.some(deviceId => deviceId.equals(device._id)))) {
    throw new Meteor.Error('opqDevices.opqDeviceWithLocation.deviceAccessDenied', 'User does not have access to device.');
  }
};


