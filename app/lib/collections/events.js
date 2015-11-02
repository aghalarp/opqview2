Events = new Mongo.Collection("events");

// Create and attach schema for this collection
EventSchema = new SimpleSchema({
  timestamp: {
    type: Date
  },
  duration: {
    type: Number,
    min: 0
  },
  event_type: {
    type: String,
    allowedValues: ['frequency', 'voltage']
  },
  value: {
    type: Number,
    decimal: true
  },
  itic: {
    type: String,
    allowedValues: ['severe', 'moderate', 'ok']
  }
});

Events.attachSchema(EventSchema);

Meteor.methods({
  insertEvent: function(doc) {
    check(doc, Events.simpleSchema());
    Events.insert(doc);
  },
  editEvent: function(doc, docId) {
    check(doc, Events.simpleSchema());
    Events.update({_id: docId}, doc);
  }
});