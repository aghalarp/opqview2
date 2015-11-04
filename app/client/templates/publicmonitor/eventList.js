Template.eventList.helpers({
  events: function() {
    if (!!Session.get('eventFilters')) {
      var filters = Session.get('eventFilters');

      check(filters, Schemas.Filters);

      console.log(filters);

      return Events.find({
        timestamp: {$gte: filters.startTime, $lte: filters.stopTime},
        value: {$gte: filters.minFreq, $lte: filters.maxFreq},
        duration: {$gte: filters.minDuration, $lte: filters.maxDuration}
      },
        {sort: {timestamp: -1}});
    }

    return Events.find({}, {sort: {timestamp: -1}}); // Reverse chronological timestamp.
  }
});