Template.filters.onRendered(function() {
  var template = Template.instance();

  // Initialize DateTimePicker input form.
  var dtp = template.$(".date");
  dtp.datetimepicker();

  var startTime = Events.findOne({}, {sort: {timestamp: 1}});
  var stopTime = Events.findOne({}, {sort: {timestamp: -1}});

  template.$("#startTime").data("DateTimePicker").date(new Date(startTime.timestamp));
  template.$("#stopTime").data("DateTimePicker").date(new Date(stopTime.timestamp));
});

Template.filters.events({
  'blur .date': function(event) {
    //event.preventDefault(); // Blur has no default behavior

    var timeInputField = event.currentTarget; // Gets the element that triggered event.
    var tif = $(timeInputField); // Get same element via jQuery selector.

    // From DateTimePicker docs:
    // All functions are accessed via the data attribute e.g. $('#datetimepicker').data("DateTimePicker").FUNCTION()
    // FYI: The data() function is from jQuery. Allows us to store arbitrary data on any element.
    // Date() function will actually grab the date. The date that we select and see on the datetimepicker widget
    // is purely visual and not actually set until we call this function.
    tif.data("DateTimePicker").date();
  }
});

Template.filters.helpers({
  iticDefaultChecked: function() {
    return ["ok", "moderate", "severe"];
  },
  minFreq: function() {
    var result = Events.findOne({}, {sort: {value: 1}});
    return result.value;
  },
  maxFreq: function() {
    var result = Events.findOne({}, {sort: {value: -1}});
    return result.value;
  },
  prefill: function() {
    var requestFreq, minFreq, maxFreq, requestVolt, minVolt, maxVolt, minDur, maxDur, itic, startTime, stopTime;

    if (!!Session.get('eventFilters')) {
      var filters = Session.get('eventFilters');

      // Simple check to see that session wasn't tampered with.
      check(filters, Schemas.Filters);

      //console.log(filters);

      requestFreq = filters.requestFreq;
      minFreq = filters.minFreq;
      maxFreq = filters.maxFreq;
      requestVolt = filters.requestVoltage;
      minVolt = filters.minVoltage;
      maxVolt = filters.maxVoltage;
      minDur = filters.minDuration;
      maxDur = filters.maxDuration;
      itic = filters.itic.slice(0); // Copy all elements to new array, rather than reference.
      startTime = filters.startTime;
      stopTime = filters.stopTime;

      return {
        requestFreq: requestFreq,
        minFreq: minFreq,
        maxFreq: maxFreq,
        requestVolt: requestVolt,
        minVolt: minVolt,
        maxVolt: maxVolt,
        minDur: minDur,
        maxDur: maxDur,
        itic: itic,
        startTime: startTime,
        stopTime: stopTime
      }
    } else {

      minFreq = Events.findOne({event_type: "frequency"}, {sort: {value: 1}});
      maxFreq = Events.findOne({event_type: "frequency"}, {sort: {value: -1}});

      minVolt = Events.findOne({event_type: "voltage"}, {sort: {value: 1}});
      maxVolt = Events.findOne({event_type: "voltage"}, {sort: {value: -1}});

      minDur = Events.findOne({}, {sort: {duration: 1}});
      maxDur = Events.findOne({}, {sort: {duration: -1}});

      return {
        minFreq: minFreq.value,
        maxFreq: maxFreq.value,
        minVolt: minVolt.value,
        maxVolt: maxVolt.value,
        minDur: minDur.duration,
        maxDur: maxDur.duration
      };
    }
  }
});