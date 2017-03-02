import { demapify } from 'es6-mapify';

Events = new Mongo.Collection("events", {idGeneration: "MONGO"});

// Create and attach schema for this collection
EventsSchema = new SimpleSchema({
  opqDeviceId: { // Reference to OpqDevice. Many-to-One relationship.
    type: Mongo.ObjectID,
    optional: true // Should be required, but currently optional for collection seeding.
  },
  locationId: { // Reference to Location. Many-to-One relationship.
    type: Mongo.ObjectID,
    optional: true // Should be required, but currently optional for collecting seeding.
  },
  timestamp: {
    type: Number // OpqHub stores Integer. For the future, we want to use a Date object instead.
  },
  event_type: {
    type: Number,
    allowedValues: Global.Enums.EventTypes.listEnumValues(),
    autoform: {
      options: function() {
        return Global.Enums.EventTypes.listEnumKeys().map(enumKey => {
          let enumeration = Global.Enums.EventTypes[enumKey];
          return {label: Global.Enums.EventTypes.getName(enumeration), value: enumeration}
        });
      }
    }
  },
  frequency: {
    type: Number,
    decimal: true
  },
  voltage: {
    type: Number,
    decimal: true
  },
  duration: {
    type: Number,
    min: 0
  },
  waveform: {
    type: String,
    optional: true
  }
});

Events.attachSchema(EventsSchema);

Meteor.methods({
  totalEventsCount(eventFilters, mapFilters) {
    check(eventFilters, Global.Schemas.EventFilters);
    check(mapFilters, Global.Schemas.MapFilters);

    const {eventsSelector, opqDevicesCursor, locationsCursor} = Global.QueryConstructors.filteredEvents(eventFilters, mapFilters);

    let freqEvents = 0;
    let voltageEvents = 0;

    const filteredEvents = Events.find(eventsSelector, {
      fields: {_id: 1, event_type: 1, duration: 1, voltage: 1},
      sort: {timestamp: -1}
    }).fetch()
      .filter(event => {
        const iticRegion = Global.Utils.PqUtils.getIticRegion(event.duration * 1000, event.voltage);
        return _.contains(eventFilters.itic, iticRegion);
      });

    filteredEvents.forEach(event => {
      if (event.event_type === Global.Enums.EventTypes.EVENT_FREQUENCY) {
        freqEvents++;
      }
      else if (event.event_type === Global.Enums.EventTypes.EVENT_VOLTAGE) {
        voltageEvents++;
      }
    });

    return {
      totalEventCount: freqEvents + voltageEvents,
      freqEventCount: freqEvents,
      voltageEventCount: voltageEvents
    }
  },
  initialFiltersData() {
    // Cannot do this on client (as latency compensated stub) because client is not subscribed yet and has no event data,
    // so attempting these queries would just result in an error.
    if (Meteor.isServer) {
      const sharableDeviceIds = OpqDevices.find({sharingData: true}, {fields: {_id: 1}}).map(device => device._id);
      const filtersData = {
        requestFreq: true,
        minFreq: Events.findOne({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}, frequency: {$exists: true}, opqDeviceId: {$in: sharableDeviceIds}}, {fields: {frequency: 1}, sort: {frequency: 1}}).frequency - 1,
        maxFreq: Events.findOne({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}, frequency: {$exists: true}, opqDeviceId: {$in: sharableDeviceIds}}, {fields: {frequency: 1}, sort: {frequency: -1}}).frequency + 1,
        requestVoltage: true,
        minVoltage: Events.findOne({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}, voltage: {$exists: true}, opqDeviceId: {$in: sharableDeviceIds}}, {fields: {voltage: 1}, sort: {voltage: 1}}).voltage - 1,
        maxVoltage: Events.findOne({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}, voltage: {$exists: true}, opqDeviceId: {$in: sharableDeviceIds}}, {fields: {voltage: 1}, sort: {voltage: -1}}).voltage + 1,
        minDuration: 1,
        maxDuration: Events.findOne({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}, duration: {$exists: true}, opqDeviceId: {$in: sharableDeviceIds}}, {fields: {duration: 1}, sort: {duration: -1}}).duration + 1,
        itic: [Global.Enums.IticRegion.PROHIBITED, Global.Enums.IticRegion.NO_DAMAGE, Global.Enums.IticRegion.NO_INTERRUPTION],
        startTime: new Date(Events.findOne({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}, timestamp: {$exists: true}, opqDeviceId: {$in: sharableDeviceIds}}, {sort: {timestamp: 1}}).timestamp - 1000),
        stopTime: new Date(Events.findOne({event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT}, timestamp: {$exists: true}, opqDeviceId: {$in: sharableDeviceIds}}, {sort: {timestamp: -1}}).timestamp + 1000)
      };

      return filtersData;
    }
  },
  eventMapCount(eventFilters, mapFilters) {
    check(eventFilters, Global.Schemas.EventFilters);
    check(mapFilters, Global.Schemas.MapFilters);

    // Get all events for the given filters.
    const {eventsSelector, opqDevicesCursor, locationsCursor} = Global.QueryConstructors.filteredEvents(eventFilters, mapFilters);
    const filteredEvents = Events.find(eventsSelector, {
      fields: {_id: 1, duration: 1, voltage: 1, locationId: 1},
      sort: {timestamp: -1}
    }).fetch()
      .filter(event => {
        event.iticRegion = Global.Utils.PqUtils.getIticRegion(event.duration * 1000, event.voltage);
        return _.contains(eventFilters.itic, event.iticRegion);
      });

    // Need a mapping from truncated gridId to number of events in that grid square
    // Move this class to separate file later after testing.
    class GridIdEventCounts {
      constructor() {
        this.okEvents = 0;
        this.moderateEvents = 0;
        this.severeEvents = 0;
      }

      update(iticRegion) {
        switch (iticRegion) {
          case Global.Enums.IticRegion.NO_INTERRUPTION:
            this.okEvents++;
            break;
          case Global.Enums.IticRegion.NO_DAMAGE:
            this.moderateEvents++;
            break;
          case Global.Enums.IticRegion.PROHIBITED:
            this.severeEvents++;
            break;
          default:
            break;
        }
      }
    }

    // Map of locationIds to gridIds.
    const locationsMap = new Map();
    Locations.find({}, {fields: {gridId: 1}}).forEach(location => {
      locationsMap.set(location._id.toHexString(), location.gridId);
    });

    // Map truncated gridIds to num events in grid square.
    const truncateLen = mapFilters.mapVisibleIds.split(';')[0].length;
    const gridIdEventCountsMap = new Map();
    filteredEvents.forEach(event => {
      const truncatedGridId = locationsMap.get(event.locationId.toHexString()).substring(0, truncateLen);
      if (!!truncatedGridId) {
        if (gridIdEventCountsMap.get(truncatedGridId)) {
          gridIdEventCountsMap.get(truncatedGridId).update(event.iticRegion);
        } else {
          gridIdEventCountsMap.set(truncatedGridId, new GridIdEventCounts());
          gridIdEventCountsMap.get(truncatedGridId).update(event.iticRegion);
        }
      }
    });

    return demapify(gridIdEventCountsMap); // De-mapify to plain object before sending back to client.
  }
});


Global.QueryConstructors.filteredEvents = function(eventFilters, mapFilters) {
  check(eventFilters, Global.Schemas.EventFilters);
  check(mapFilters, Global.Schemas.MapFilters);

  // Create selector object for the find query.
  const eventsSelector = {
    event_type: {$ne: Global.Enums.EventTypes.EVENT_HEARTBEAT},
    timestamp: {$gte: eventFilters.startTime.getTime(), $lte: eventFilters.stopTime.getTime()},
    duration: {$gte: eventFilters.minDuration, $lte: eventFilters.maxDuration}
  };

  // Check for the selected event types. Create array of query conditions to be used with $or operator.
  const eventTypeValuesDisjunction = [];
  if (!!eventFilters.requestFreq) {
    eventTypeValuesDisjunction.push({
      event_type: Global.Enums.EventTypes.EVENT_FREQUENCY,
      frequency: {$gte: eventFilters.minFreq, $lte: eventFilters.maxFreq}
    });
  }

  if (!!eventFilters.requestVoltage) {
    eventTypeValuesDisjunction.push({
      event_type: Global.Enums.EventTypes.EVENT_VOLTAGE,
      voltage: {$gte: eventFilters.minVoltage, $lte: eventFilters.maxVoltage}
    });
  }

  // Concat the $or expression to the selector obj. If no event types selected, we want to return 0 documents.
  // 'event_type: null' accomplishes this, as null is not a valid event_type value and will yield 0 results.
  (eventTypeValuesDisjunction.length > 0) ? eventsSelector["$or"] = eventTypeValuesDisjunction : eventsSelector.event_type = null;

  // We want to find all events that occurred where the list of gridIds starts with a location id
  const visibleIdList = mapFilters.mapVisibleIds.split(";");
  const gridIdsDisjunction = [];
  // For each visible grid id, we add an additional query condition.
  for (const gridId of visibleIdList) {
    gridIdsDisjunction.push({
      gridId: {$regex: '^' + gridId, $options: ''} // RegExp: "Starts with gridId"
      //gridId: new RegExp('^' + gridId) // Also works
    });
  }

  // Now we grab Event's relational data: OpqDeviceIds and LocationIds
  // Get all OpqDevice ids that permit sharingData.
  const opqDevicesCursor = OpqDevices.find({sharingData: {$eq: true}}, {fields: {_id: 1, sharingData: 1}});
  const sharedOpqDeviceIds = opqDevicesCursor.map(device => device._id);
  eventsSelector.opqDeviceId = {$in: sharedOpqDeviceIds};

  // Get array of Location ids, which is then added as an additional condition to the Event query.
  let locationsCursor;
  if (gridIdsDisjunction.length > 0) {
    locationsCursor = Locations.find({"$or": gridIdsDisjunction}, {fields: {_id: 1, gridId: 1}});
    const locationIds = locationsCursor.map(location => location._id);
    eventsSelector.locationId = {$in: locationIds};
  }

  return {eventsSelector, opqDevicesCursor, locationsCursor}
};

/**
 * Checks if given location_id exists for any Event. Useful for safe removal of unused Locations.
 * @param location_id - The Mongo id of the location.
 * @returns {boolean} - Returns true if location_id is not in use, false otherwise.
 */
export const isUnusedEventLocation = (location_id) => {
  check(location_id, Mongo.ObjectID);
  //const eventCount = Events.find({locationId: location_id}).count();
  //return (eventCount > 0) ? false : true;
  return new Promise((resolve, reject) => {
    Events.rawCollection().count({locationId: MongoInternals.NpmModule.ObjectID(location_id.toHexString())}, function(err, count) {
      if (err) {
        reject(err);
      }
      console.log('Events Count: ', count);
      (count > 0) ? resolve(false) : resolve(true);
    });
  });
};