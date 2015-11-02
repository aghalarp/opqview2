Template.eventList.helpers({
  events: function() {
    if (!!Session.get('eventFilters')) {
      var filters = Session.get('eventFilters');

      check(filters, Schemas.Filters);

      return Events.find({
        timestamp: {$gte: filters.startTime},
        timestamp: {lte: filters.stopTime},
        value: {$gte: filters.minFreq},
        value: {$lte: filters.maxFreq},
        duration: {$gte: filters.minDuration},
        duration: {$lte: filters.maxDuration},
      },
        {sort: {timestamp: -1}});
    }

    return Events.find({}, {sort: {timestamp: -1}}); // Reverse chronological timestamp.
  }
});