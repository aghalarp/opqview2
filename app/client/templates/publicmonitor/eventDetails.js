//import flot from 'flot-charts';

Template.eventDetails.onCreated(function() {
  const template = this;

  template.selectedEventId = template.data.selectedEventIdRef;
  template.prevSelectedEventId = template.data.prevSelectedEventIdRef;
  template.selectedEventTrigger = template.data.selectedEventTriggerRef;
  template.currentPage = template.data.currentPageRef;

  template.subscriptionHandler = null;

  // Subscribe to currently selected event.
  template.autorun(function() {
    const selectedEventId = template.selectedEventId.get();

    if (selectedEventId === null && !!template.subscriptionHandler) {
      template.subscriptionHandler.stop();
    }
    else if (!!selectedEventId) {
      template.subscriptionHandler = template.subscribe("singleEvent", selectedEventId);
    }
  });

});

Template.eventDetails.onRendered(function() {
  const template = this;


  // Plots waveform whenever an event is selected.
  template.autorun(function() {
    const selectedEventId = template.selectedEventId.get();

    if (!!selectedEventId && template.subscriptionsReady()) {
      Tracker.afterFlush(function() {
        const waveformData = Events.findOne({_id: new Mongo.ObjectID(selectedEventId)}).waveform;

        // Create an array of [x, y] points
        const plotPoints = waveformData.split(",")
            .map(function(pt, idx) {
              return [idx, parseFloat(pt)];
            });

        // Some of these options are deprecated... fix later.
        const plotOptions = {
          zoom: {
            interactive: true
          },
          pan: {
            interactive: true
          },
          acisLabels: {
            show: true
          },
          xaxis: {
            ticks: 5,
            min: 1000,
            max: 3000
          },
          xaxes: [{
            axisLabel: "Samples"
          }],
          yaxes: [{
            axisLabel: "Voltage"
          }],
          series: {
            lines: {show: true},
            points: {show: false}
          }
        };

        $.plot($("#waveform"), [plotPoints], plotOptions);
      });
    }
  });

});

Template.eventDetails.helpers({
  event() {
    const template = Template.instance();
    const selectedEventId = template.selectedEventId.get();

    if (!!selectedEventId && template.subscriptionsReady()) {
      return Events.findOne({_id: new Mongo.ObjectID(selectedEventId)});
    }
  },
  iticBadge() {
    const event = this;
    const iticRegion = Global.Utils.PqUtils.getIticRegion(event.duration * 1000, event.voltage); // Ask Anthony why we multiply by 1000 here.

    let badge;
    switch (iticRegion) {
      case Global.Enums.IticRegion.NO_INTERRUPTION:
        badge = "itic-no-interruption";
        break;
      case Global.Enums.IticRegion.NO_DAMAGE:
        badge = "itic-no-damage";
        break;
      case Global.Enums.IticRegion.PROHIBITED:
        badge = "itic-prohibited";
        break;
      default:
        badge = "N/A";
        break;
    }

    return badge;
  }
});

Template.eventDetails.events({
  'click #prev-event-btn': function(event) {
    const template = Template.instance();
    const currentPage = template.currentPage.get();
    const selectedEventId = template.selectedEventId.get();
    const currentEventRow = $(`#${selectedEventId}`);

    // First store previous selected event id.
    template.prevSelectedEventId.set(selectedEventId);

    // If at top of list, go back one page.
    if ((currentEventRow.attr("id") == $('#events tbody>tr:first').attr('id')) && currentPage > 1) {
      template.selectedEventTrigger.set('prevPageBottom');
      template.selectedEventId.set(null); // Unsubscribe singleEvent before changing page so doesn't carry over.
      Tracker.autorun(function() {
        template.currentPage.set(currentPage - 1);
      });
    } else {
      // Otherwise select previous row id.
      const prevRowId = currentEventRow.prev().attr("id");
      if (!!prevRowId) template.selectedEventId.set(prevRowId);
    }
  },
  'click #next-event-btn': function(event) {
    const template = Template.instance();
    const currentPage = template.currentPage.get();
    const selectedEventId = template.selectedEventId.get();
    const currentEventRow = $(`#${selectedEventId}`);

    // First store previous selected event id.
    template.prevSelectedEventId.set(selectedEventId);

    // If at bottom of list, go forward one page.
    if ((currentEventRow.attr("id") == $('#events tbody>tr:last').attr('id'))) { // Need to add totalPages check here so doesn't go beyond max page.
      template.selectedEventTrigger.set('nextPageTop');
      template.selectedEventId.set(null); // Unsubscribe singleEvent before changing page so doesn't carry over.
      Tracker.autorun(function() {
        template.currentPage.set(currentPage + 1);
      });
    } else {
      // Otherwise select previous row id.
      const nextRowId = currentEventRow.next().attr("id");
      if (!!nextRowId) template.selectedEventId.set(nextRowId);
    }
  }
});