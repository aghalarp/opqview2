Template.eventList.helpers({
  events: function() {
    if (!!Session.get('eventFilters')) {
      var filters = Session.get('eventFilters');

      check(filters, Schemas.Filters);

      //console.log(filters);

      return Events.find({
        timestamp: {$gte: filters.startTime, $lte: filters.stopTime},
        value: {$gte: filters.minFreq, $lte: filters.maxFreq},
        duration: {$gte: filters.minDuration, $lte: filters.maxDuration}
      },
        {sort: {timestamp: -1}});
    }

    // If no filters set yet, return all events.
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