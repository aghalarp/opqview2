Meteor.publish("practiceCollection", function() {
  return Practice.find();
});

Meteor.publish("eventsCollection", function() {
  return Events.find();
});