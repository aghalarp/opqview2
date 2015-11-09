Template.eventList.helpers({
  events: function() {
    if (!!Session.get('eventFilters')) {
      var filters = Session.get('eventFilters');

      check(filters, Schemas.Filters);

      // Add an extra second to stopTime due to precision issue when querying.
      filters.stopTime.setSeconds(filters.stopTime.getSeconds() + 1);

      // Check for the selected event types. Create array of expressions to be used with $or operator.
      var eventTypeValues = [];
      if (!!filters.requestFreq) {
        eventTypeValues.push({
          event_type: "frequency",
          value: {$gte: filters.minFreq, $lte: filters.maxFreq}
        });
      }

      if (!!filters.requestVoltage) {
        eventTypeValues.push({
          event_type: "voltage",
          value: {$gte: filters.minVoltage, $lte: filters.maxVoltage}
        });
      }

      // Construct query object.
      var query = {
        timestamp: {$gte: filters.startTime, $lte: filters.stopTime},
        duration: {$gte: filters.minDuration, $lte: filters.maxDuration},
        itic: {$in: filters.itic}
      };

      // Concat the $or expression to query, or set null event_type if no types selected.
      (eventTypeValues.length > 0) ? query["$or"] = eventTypeValues : query["event_type"] = null;

      // Query and return results.
      return Events.find(query, {sort: {timestamp: -1}});
    }

    // If no filters set, return all events.
    return Events.find({}, {sort: {timestamp: -1}}); // Reverse chronological timestamp.
  },
  totalEventCount: function() {
    return Events.find({}).count();
  },
  freqEventCount: function() {
    return Events.find({event_type: "frequency"}).count();
  },
  voltageEventCount: function() {
    return Events.find({event_type: "voltage"}).count();
  }
});