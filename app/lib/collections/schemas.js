// Schema object to hold non-collection related schemas.
// Registered in client/helpers/global.js
Schemas = {};

Schemas.Filters = new SimpleSchema({
  requestFreq: {
    type: Boolean,
    optional: true,
    label: " " // Due to bug with afFormGroup, must do this to have empty label. Must have space between quotes.
  },
  minFreq: {
    type: Number,
    decimal: true
  },
  maxFreq: {
    type: Number,
    decimal: true
  },
  requestVoltage: {
    type: Boolean,
    optional: true,
    label: " " // Due to bug with afFormGroup, must do this to have empty label. Must have space between quotes.
  },
  minVoltage: {
    type: Number,
    decimal: true
  },
  maxVoltage: {
    type: Number,
    decimal: true
  },
  minDuration: {
    type: Number
  },
  maxDuration: {
    type: Number
  },
  itic: {
    type: [String],
    allowedValues: ['severe', 'moderate', 'ok'],
    autoform: {
      options: [
        {label: "Severe", value: "severe"},
        {label: "Moderate", value: "moderate"},
        {label: "OK", value: "ok"}
      ]
    }
  },
  startTime: {
    type: String
  },
  stopTime: {
    type: String
  }

});

Meteor.methods({
  setFilters: function(doc) {
    check(doc, Schemas.Filters);

    if (Meteor.isClient) {
      Session.set('eventFilters', doc); // Can probably just do this in event map...
    }
  }
});