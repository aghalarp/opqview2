Template.filters.onCreated(function() {
  const template = this;
  template.eventFilters = template.data.eventFiltersRef;

  Meteor.call("initialFiltersData", function(err, result) {
    template.eventFilters.set(result);
  });

});

Template.filters.onRendered(function() {
  const template = this;

  // Sets the DateTimePicker widget values for start and stop time.
  template.autorun(function() {
    const eventFilters = template.eventFilters.get();
    if (!!eventFilters) {
      jQueryPromise('#startTime', 200, 2000)
        .then(startTimePicker => {
          startTimePicker.datetimepicker({
            defaultDate: eventFilters.startTime,
            format: "MM/DD/YYYY H:mm:ss"
          });
        })
        .catch(error => {
          console.log(error);
        });

      jQueryPromise('#stopTime', 200, 2000)
        .then(stopTimePicker => {
          stopTimePicker.datetimepicker({
            defaultDate: eventFilters.stopTime,
            format: "MM/DD/YYYY H:mm:ss"
          });
        })
        .catch(error => {
          console.log(error);
        });
    }
  });

});

Template.filters.events({
  'submit #filterForm': function(event, template) {
    event.preventDefault();
    console.log("Submit event triggered.");
  },
  'blur .date': function(event) {
    //event.preventDefault(); // Blur has no default behavior

    const timeInputField = event.currentTarget; // Gets the element that triggered event.
    const tif = $(timeInputField); // Get same element via jQuery selector.

    // From DateTimePicker docs:
    // All functions are accessed via the data attribute e.g. $('#datetimepicker').data("DateTimePicker").FUNCTION()
    // FYI: The data() function is from jQuery. Allows us to store arbitrary data on any element.
    // Calling the date() function will actually grab the date (as a moment object). The date that we select and see on the datetimepicker widget
    // is purely visual and not actually set until we call this function.
    // Also note that the widget seems to round to the nearest second. As a result, we add and subtract 1 second
    // to the max and min timestamp before querying the database to avoid rounding issues.
    tif.data("DateTimePicker").date();

    // Submit after change is made.
    $("#filterForm").submit();
  },
  // Submit form when any input is detected. Maybe unnecessary. Do it anyway!
  'change, keyup': function(event) {
    $("#filterForm").submit();
  }
});


Template.filters.helpers({
  filtersSchema() {
    return Global.Schemas.EventFilters;
  },
  prefillFilters() {
    return Template.instance().eventFilters.get();
  },
  getTemplateInstance() {
    return Template.instance();
  }
});

AutoForm.hooks({
  filterForm: {
    onSubmit: function(insertDoc, updateDoc, currentDoc) {
      Global.Schemas.EventFilters.clean(insertDoc);
      check(insertDoc, Global.Schemas.EventFilters);
      // Because we cannot access template instance in Autoform hooks, we had to attach the template instance to the
      // Autoform itself in order to access it here.
      this.formAttributes.templateInstance.eventFilters.set(insertDoc);
      this.done();
      return false;
    }
  }
});