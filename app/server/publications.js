Meteor.publish('currentPerson', function(user_id) {
  const currentPerson = Person.find({userId: this.userId});
  return (currentPerson) ? currentPerson : [];
});


Meteor.publish('measurements', function(startTimeSecondsAgo, deviceId) {
  check(startTimeSecondsAgo, Number);
  const self = this;
  const startTimeMs = Date.now() - (startTimeSecondsAgo * 1000);
  const publishedMeasurementsMap = new Map(); // {timestamp: id} - To keep track of currently published measurements.

  const selector = (deviceId) ? {device_id: deviceId, timestamp_ms: {$gte: startTimeMs}} : {timestamp_ms: {$gte: startTimeMs}};

  let init = true;
  const measurementsHandle = Measurements.find(selector, {
    fields: {_id: 1, timestamp_ms: 1, voltage: 1, frequency: 1, device_id: 1},
    pollingIntervalMs: 1000
  }).observeChanges({
    added: function(id, fields) {
      publishedMeasurementsMap.set(fields.timestamp_ms, id);
      self.added('measurements', id, fields);

      if (!init) {
        const startTime = Date.now() - (startTimeSecondsAgo * 1000);
        publishedMeasurementsMap.forEach((id, timestamp) => { // Note: (id, timestamp) corresponds to (value, key)
          if (timestamp < startTime) {
            self.removed('measurements', id);
            publishedMeasurementsMap.delete(timestamp);
          }
        });
      }
    }
  });
  init = false;
  self.ready();
  self.onStop(function() {
    measurementsHandle.stop();
  });
});




/**
 * Publish OpqDevice and its corresponding Location.
 * @param {string} deviceId - OPQ designated device ID (not mongo id). Although this id is stored as a Number, the
 * publish function expects a String due to how FlowRouter always grabs URL parameters as strings.
 */
Meteor.publish('opqDeviceWithLocation', function(deviceId) {
  const self = this;
  const userId = this.userId; // Get logged-in user.
  const {opqDeviceSelector, locationCursor, personCursor} = Global.QueryConstructors.opqDeviceWithLocation(deviceId, userId);
  const opqDeviceCursor = OpqDevices.find(opqDeviceSelector, {fields: {deviceId: 1, accessKey: 1, description: 1, sharingData: 1, locationId: 1}});

  // Publish person to client.
  const personObsHandle = createBasicObserver('persons', personCursor, self);

  // Publish location to client.
  const locationObsHandle = createBasicObserver('locations', locationCursor, self, {added: true, changed: true, removed: false});

  // Keep track of currently published location.
  const location = locationCursor.fetch()[0];
  let currPublishedLocationId = (location) ? location._id : null;

  // Set up observer on device cursor.
  const deviceObsHandle = opqDeviceCursor.observeChanges({
    added: function(id, fields) {
      self.added('opqDevices', id, fields);
    },
    changed: function(id, fields) {
      self.changed('opqDevices', id, fields);
      // If locationId has changed for this device, remove old location and add new one from client.
      if (fields.hasOwnProperty('locationId')) {
        const location = Locations.findOne({_id: fields.locationId});
        self.removed('locations', currPublishedLocationId);
        self.added('locations', location._id, location);
        currPublishedLocationId = location._id;
      }
    }
  });

  self.ready();

  self.onStop(function() {
    deviceObsHandle.stop();
    personObsHandle.stop();
    locationObsHandle.stop();
  });
});

/**
 * Publish OpqDevices that do not belong/unlinked to the current user.
 */
Meteor.publish('publicOpqDevices', function() {
  const userId = this.userId; // Get logged-in user.
  const {opqDevicesSelector, personCursor} = Global.QueryConstructors.publicOpqDevices(userId);

  if (opqDevicesSelector && personCursor) {
    const devices = OpqDevices.find(opqDevicesSelector, {
      fields: {_id: 1, deviceId: 1, accessKey: 1, description: 1, sharingData: 1, lastHeartbeat: 1}
    });

    return [devices, personCursor];
  }

  return [];
});



/**
 * Publish OpqDevices that belong to the currently logged-in user.
 */
Meteor.publish('userOpqDevices', function() {
  const userId = this.userId; // Get logged-in user.
  const {opqDevicesSelector, personCursor} = Global.QueryConstructors.userOpqDevices(userId);

  if (opqDevicesSelector && personCursor) {
    const devices = OpqDevices.find(opqDevicesSelector, {
      fields: {_id: 1, deviceId: 1, accessKey: 1, description: 1, sharingData: 1, lastHeartbeat: 1}
    });

    return [devices, personCursor];
  }

  return [];
});

Meteor.publish('opqDeviceEventCounts', function(localCollectionName) {
  check(localCollectionName, String);
  const self = this;
  const collectionName = localCollectionName;
  const userId = this.userId; // Get logged-in user.
  const person = Persons.findOne({userId: userId});
  if (person && person.opqDevices) {
    const deviceIds = person.opqDevices;
    const countsMap = new Map();
    const subHandles = [];


    /**
     * Loop through deviceIds twice: Once for sending initial counts to client, and again for setting up observers.
     * We take this approach because setting up two observers for every device can a while to finish - and so to avoid
     * making the client wait, we can immediately send the initial counts first and allow the observers to
     * set up in the background.
     */
    deviceIds.forEach(devId => {
      countsMap.set(devId, {freqCount: 0, voltCount: 0});

      const freqCount = Events.find({
        opqDeviceId: devId,
        event_type: Global.Enums.EventTypes.EVENT_FREQUENCY,
        timestamp: {$gte: 0, $lte: Date.now()}
      }).count();

      const voltCount = Events.find({
        opqDeviceId: devId,
        event_type: Global.Enums.EventTypes.EVENT_VOLTAGE,
        timestamp: {$gte: 0, $lte: Date.now()}
      }).count();

      countsMap.get(devId).freqCount = freqCount;
      countsMap.get(devId).voltCount = voltCount;

      // Send initial counts to client.
      self.added(collectionName, devId, {freqCount: freqCount});
      self.added(collectionName, devId, {voltCount: voltCount});
    });

    self.ready(); // Mark subscription as ready so client can display initial data.



    // Set up query observers to reactively push new event counts to client.
    let init = true;
    deviceIds.forEach(devId => {
      // Query for freq and volt counts.
      const freqCountHandle = Events.find({
        opqDeviceId: devId,
        event_type: Global.Enums.EventTypes.EVENT_FREQUENCY,
        timestamp: {$gte: 0, $lte: Date.now()}
      }, {fields: {_id: 1}}).observeChanges({
        added: function() {
          if (!init) {
            countsMap.get(devId).freqCount++;
            self.changed(collectionName, devId, {freqCount: countsMap.get(devId).freqCount});
          }
        },
        removed: function() {
          countsMap.get(devId).freqCount--;
          self.changed(collectionName, devId, {freqCount: countsMap.get(devId).freqCount});
        }
      });

      const voltCountHandle = Events.find({
        opqDeviceId: devId,
        event_type: Global.Enums.EventTypes.EVENT_VOLTAGE,
        timestamp: {$gte: 0, $lte: Date.now()}
      }, {fields: {_id: 1}}).observeChanges({
        added: function() {
          if (!init) {
            countsMap.get(devId).voltCount++;
            self.changed(collectionName, devId, {voltCount: countsMap.get(devId).voltCount});
          }
        },
        removed: function() {
          countsMap.get(devId).voltCount--;
          self.changed(collectionName, devId, {voltCount: countsMap.get(devId).voltCount});
        }
      });

      // Don't need to keep track of which device id these handles belong to; will just stop() all of them later.
      subHandles.push(freqCountHandle);
      subHandles.push(voltCountHandle);
    });

    init = false;

    // Stops observing cursors when client unsubscribes.
    self.onStop(function() {
      subHandles.forEach(handle => {
        handle.stop();
      })
    })
  }

  self.ready(); // User does not have any devices.
});

/**
 * Publication of Events for the publicmonitor/eventList template. Sets up an observer on the Events collection to
 * reactively push any new events to the client if they match the current filter query.
 * @param {Object} eventFilters - The criteria by which to filter the events with.
 * @param {Object} mapFilters - Additional event filters pertaining to the map.
 * @param page {number} - The current page of events.
 * @param eventsPerPage {number} - The number of events to show per page.
 */
Meteor.publish("eventsCollection", function(eventFilters, mapFilters, page, eventsPerPage) {
  check(eventFilters, Global.Schemas.EventFilters);
  check(mapFilters, Global.Schemas.MapFilters);
  check(page, Number);
  check(eventsPerPage, Number);

  const self = this;

  const {eventsSelector, opqDevicesCursor, locationsCursor} = Global.QueryConstructors.filteredEvents(eventFilters, mapFilters);

  const opqDevicesObsHandle = createBasicObserver('opqDevices', opqDevicesCursor, self);
  const locationsObsHandle = createBasicObserver('locations', locationsCursor, self);

  // Must query entire database here for the given query, so no skipping or limiting.
  const filteredEvents = Events.find(eventsSelector, { // Try to optimize this later. Still a bit slow.
    fields: {waveform: 0},
    sort: {timestamp: -1}
  });

  // Fetch initial results as array b/c Meteor's MongoDB doesn't support manual Cursor iteration methods (next, hasNext)
  const initialFilteredEvents = filteredEvents.fetch();

  // Get IDs of the initial events we will publish to client.
  const paginatedEventIds = mapAndPaginate(initialFilteredEvents, page, eventsPerPage, (eventDoc) => {
    const eventIticRegion = Global.Utils.PqUtils.getIticRegion(eventDoc.duration * 1000, eventDoc.voltage);
    return (_.contains(eventFilters.itic, eventIticRegion)) ? eventDoc._id : null;
  });

  const publishedEventsTimestamps = []; // Array to keep track of currently published events.

  // Send initial events to the client.
  Events.find({_id: {$in: paginatedEventIds}}, {
    fields: {waveform: 0} // Exclude waveform data - not needed until individual event is selected.
  }).forEach(event => {
    publishedEventsTimestamps.push(event.timestamp); // Keep track of published events in-memory.
    self.added("events", event._id, event); // Push event to client.
  });
  self.ready(); // Notify client that all initial events have been sent.


  // Set up observer to reactively push new events to client if event matches current query filters.
  let initializing = true; // Only want to send new events to client.
  const filteredEventsObsHandle = filteredEvents.observe({
    added: function(doc) {
      // If newly added event's timestamp falls between the range of the currently published events, we'll remove the
      // minTimestamp event and add the new event to client. Also must check that new event has itic region that matches
      // the user's filter selection.
      if (!initializing) {
        const minTimestamp = _.min(publishedEventsTimestamps);
        const maxTimestamp = _.max(publishedEventsTimestamps);
        const eventIticRegion = Global.Utils.PqUtils.getIticRegion(doc.duration * 1000, doc.voltage);

        if (_.contains(eventFilters.itic, eventIticRegion) &&
            ((page > 0 && doc.timestamp >= minTimestamp && doc.timestamp <= maxTimestamp) ||
            (page == 0 && doc.timestamp >= minTimestamp))) { // On first page, only care about minTimestamp

          // Get minTimestamp event and remove it
          const minEvent = Events.findOne({timestamp: minTimestamp});
          if (!!minEvent) {
            // Remove min timestamp event on client and publishedEventsTimestamps array.
            self.removed('events', minEvent._id);

            // This approach ensures we only remove 1 instance of the timestamp in case of duplicate timestamps.
            const minTimestampIndex = _.indexOf(publishedEventsTimestamps, minTimestamp);
            if (minTimestampIndex !== -1) publishedEventsTimestamps.splice(minTimestampIndex, 1);

            // Then add new event to client and update publishedEventsTimestamps array.
            self.added('events', doc._id, doc);
            publishedEventsTimestamps.push(doc.timestamp);
          }
        }
      }
    },
    changed: function(newDoc, oldDoc) {
      self.changed('events', oldDoc._id, newDoc);
    },
    removed: function(removedDoc) {
      // If the removed event's timestamp is between the timestamp range of the currently published events, we need to
      // replace it with the correct subsequent event so that we maintain same number of docs on client.
      // Note: Event removal is not possible with the current app. This is only for demonstrating reactive doc removals.
      const minTimestamp = _.min(publishedEventsTimestamps);
      const maxTimestamp = _.max(publishedEventsTimestamps);

      if ((page > 0 && removedDoc.timestamp >= minTimestamp && removedDoc.timestamp <= maxTimestamp) ||
          (page == 0 && removedDoc.timestamp >= minTimestamp)) { // On first page, only care about minTimestamp

        // First remove old doc from client.
        self.removed('events', removedDoc._id);
        // This approach ensures we only remove 1 instance of the timestamp in case of multiple events w/ same timestamp
        const minTimestampIndex = _.indexOf(publishedEventsTimestamps, minTimestamp);
        if (minTimestampIndex !== -1) publishedEventsTimestamps.splice(minTimestampIndex, 1);

        // Then add the replacing event, which is the next event sorted by timestamp for the given query.
        const events = Events.find(eventsSelector, {
          fields: {_id: 1, timestamp: 1, duration: 1, voltage: 1},
          sort: {timestamp: -1}
        }).fetch();

        const paginatedEventIds = mapAndPaginate(events, page, eventsPerPage, (eventDoc) => {
          const eventIticRegion = Global.Utils.PqUtils.getIticRegion(eventDoc.duration * 1000, eventDoc.voltage);
          return (_.contains(eventFilters.itic, eventIticRegion)) ? eventDoc._id : null;
        });

        // Need this for unlikely edge case where replacement event happens to have exact same timestamp as current minTimestamp event.
        const minTimestampEventId = Events.findOne({timestamp: minTimestamp}, {fields: {_id: 1}})._id;

        const replacementEvent = Events.findOne({_id: {$in: paginatedEventIds, $ne: minTimestampEventId}, timestamp: {$lte: minTimestamp}}, {
          fields: {waveform: 0},
          sort: {timestamp: -1}
        });

        self.added('events', replacementEvent._id, replacementEvent);
        publishedEventsTimestamps.push(replacementEvent.timestamp);
      }
    }
  });

  initializing = false;

  self.onStop(function() {
    filteredEventsObsHandle.stop();
    opqDevicesObsHandle.stop();
    locationsObsHandle.stop();
  });
});

Meteor.startup(function () {
  // Benefits eventsCollection publication, specifically the filteredEvents query. Tried to separately create indices
  // for the $or clause in the filteredEvents query but didn't seem to help much, so not using it. Look more into this later.
  // Also separately benefits initialFiltersData meteor method call (event_type: 1 alone is the benefactor).
  Events._ensureIndex({event_type: 1, timestamp: -1, duration: 1});

  Events._ensureIndex({timestamp: -1});

  //Events._ensureIndex({opqDeviceId: 1, event_type: 1,  timestamp: 1}); // Benefits opqDeviceEventCounts
});

Meteor.publish("singleEvent", function(eventId) {
  check(eventId, String);

  const mongoObjId = new Mongo.ObjectID(eventId);

  return Events.find({_id: mongoObjId});
});

Meteor.publish("personsCollection", function() {
  return Persons.find();
});


// Initial event filters data
Meteor.publish("findMinEventProperty", function(field) {
  return Events.find({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}}, {
    fields: {event_type: 1, [field]: 1},
    sort: {[field]: 1},
    limit: 1
  });
});

Meteor.publish("findMaxEventProperty", function(field) {
  return Events.find({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}}, {
    fields: {event_type: 1, [field]: 1},
    sort: {[field]: -1},
    limit: 1
  });
});

Meteor.publish("locations", function() {
  return Location.find();
});


/**
 * The function to call on each document. Must return null for docs the caller wishes to skip.
 * @callback docMappingCallback
 * @param {Object} doc - The current document being iterated on.
 */
/**
 * Maps the given function on an array of documents, then removing documents not on the current 'page'. Unlike the
 * regular map() function, which iterates through the entire array, this function will short-circuit once an appropriate
 * number of documents have been found. This is noticeably advantageous on large sets of documents because the function
 * will not needlessly iterate over the rest of the documents - we only care about the documents leading up to the
 * current page.
 *
 * @param {Object[]} docs - The array of collection documents to paginate.
 * @param {number} page - The page number to paginate on.
 * @param {number} docsPerPage - The number of documents displaying per page.
 * @param {docMappingCallback} callback - The function to call on each document. Must return null for docs the caller
 * wishes to skip.
 * @returns {Object[]} - The callback-applied resulting set of documents, with previous 'pages' removed.
 */
export const mapAndPaginate = (docs, page, docsPerPage, callback) => {
  const resultDocs = [];
  const skip = page * docsPerPage; // Assuming 0 based numbering on page.

  /**
   * We must use (skip + docsPerPage) as the limiting condition because we are paginating and must get ALL the docs
   * up to the current page (skip + docsPerPage number of docs) before paginating/slicing out the preceding docs that
   * we do not need (the previous page docs).
   */
  for (let i = 0; resultDocs.length < (skip + docsPerPage) && i < docs.length; i++) {
    const doc = docs[i];
    const resultDoc = callback(doc); // Callback must return null for the docs the caller wishes to skip.
    if (resultDoc) resultDocs.push(resultDoc);
  }

  const paginatedResultDocs = resultDocs.slice(skip, skip + docsPerPage);
  return paginatedResultDocs;
};

/**
 * Creates a basic and minimal observer on the given cursor. The observeChanges callbacks are pre-defined and minimal;
 * they simply add, change, and remove documents when these modifications are detected on the given cursor.
 *
 * @param {string} collectionName - The Meteor name of the collection to modify. Should match the cursor's collection.
 * @param {Cursor} cursor - The cursor to observe.
 * @param {Object} publicationContext - The context (this) from the publish function.
 * @param {Object} options - The observeChanges callbacks to use.
 * @param {boolean} options.added - True to include, false to exclude.
 * @param {boolean} options.changed - True to include, false to exclude.
 * @param {boolean} options.removed - True to include, false to exclude.
 * @returns {Object} - The observer handle on the cursor. Be sure to call .stop() on the handle when done!
 */
export const createBasicObserver = (collectionName, cursor, publicationContext, options = {added: true, changed: true, removed: true}) => {
  check(collectionName, String);
  check(options, {
    added: Boolean,
    changed: Boolean,
    removed: Boolean
  });

  const self = publicationContext;

  const observeCallbacks = {};
  if (options.added) {
    observeCallbacks.added = function(id, fields) {
      self.added(collectionName, id, fields);
    }
  }
  if (options.changed) {
    observeCallbacks.changed = function(id, fields) {
      self.changed(collectionName, id, fields);
    }
  }
  if (options.removed) {
    observeCallbacks.removed = function(id) {
      self.removed(collectionName, id);
    }
  }

  const cursorObsHandle = cursor.observeChanges(observeCallbacks);

  return cursorObsHandle;
};