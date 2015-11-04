Template.eventDetails.helpers({
  event: function() {
    if (!!Session.get('selectedEvent')) {
      var eventId = Session.get('selectedEvent');

      return Events.findOne({_id: eventId});
    }
  },
  eventDate: function() {
    if (!!Session.get('selectedEvent')) {
      var eventId = Session.get('selectedEvent');

      return Events.findOne({_id: eventId}, {timestamp: 1}).timestamp; // Just return timestamp of event.
    }
  }
});