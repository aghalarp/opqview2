import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import { BoxEvents } from '../../../api/boxEvent/BoxEventCollection.js';
import { EventData } from '../../../api/eventData/EventDataCollection.js';
import { getRecentEventDataReqIds } from '../../../api/eventData/EventDataCollectionMethods.js'

// Templates and Sub-Template Inclusions
import './research.html';
import '../../components/liveMeasurements/liveMeasurements.js';
import '../../components/eventCountChart/eventCountChart.js';



Template.research.onCreated(function() {
  const template = this;

  template.selectedEventId = new ReactiveVar();
  template.recentEventDataReqIds = new ReactiveVar();
  template.isLoadingRecentEventDataReqIds = new ReactiveVar(false);
  template.selectedEventDataReqId = new ReactiveVar();
  template.toggleFullEvents = new ReactiveVar(false);
  template.eventCountChart = null;

  // Subscriptions
  template.autorun(() => {
    const selectedRequestId = template.selectedEventDataReqId.get();
    const selectedEventId = template.selectedEventId.get();
    if (selectedRequestId) template.subscribe(EventData.publicationNames.EVENT_DATA, Number(selectedRequestId));
    if (selectedEventId) {
      template.subscribe(EventData.publicationNames.EVENT_DATA, Number(selectedEventId));
    }
  });

  // Automatically selects most recent event received from server.
  // template.autorun(() => {
  //   const newestEvent = SimulatedEvents.findOne({}, {sort: {timestamp_ms: -1}});
  //
  //   if (newestEvent && template.subscriptionsReady()) {
  //     const newestEventId = newestEvent._id.toHexString();
  //     template.selectedEventId.set(newestEventId);
  //   }
  // });

  // Ensures most recently selected event is highlighted.
  template.autorun(() => {
    const selectedEventDataReqId = template.selectedEventDataReqId.get();

    if (selectedEventDataReqId && template.subscriptionsReady()) {
      // Highlight newest event, un-highlight old event.
      template.$('#recent-events > tbody >  tr').removeClass('active');
      template.$(`#recent-events tr#${selectedEventDataReqId}`).addClass('active');
    }
  });

  // Get most recent EventData Ids.
  template.autorun(() => {
    const toggleFullEvents = template.toggleFullEvents.get();
    if (toggleFullEvents) {
      template.isLoadingRecentEventDataReqIds.set(true);
      getRecentEventDataReqIds.call({numEvents: 20}, (err, requestIds) => {
        template.isLoadingRecentEventDataReqIds.set(false);
        if (err) {
          console.log(err)
        } else {
          console.log(requestIds);
          template.recentEventDataReqIds.set(requestIds);
          // template.selectedEventDataReqId.set(requestIds[0]); // Select first event by default.
        }
      });
    }
  });

});

Template.research.onRendered(function() {
  const template = this;

  template.$('.ui.checkbox').checkbox(); // Enable Semantic-UI toggle styled checkbox.

  // Plots waveform whenever an event is selected.
  template.autorun(function() {
    // const selectedEventId = template.selectedEventId.get();
    // const event = SimulatedEvents.findOne({_id: new Mongo.ObjectID(selectedEventId)});
    const selectedRequestId = template.selectedEventDataReqId.get();
    const eventData = EventData.findOne({request_id: Number(selectedRequestId)});
    console.log(eventData);

    if (selectedRequestId && eventData && template.subscriptionsReady()) {
      Tracker.afterFlush(function() {

        // Plot options. Some of these options are deprecated... fix later.
        const plotOptions = {
          zoom: {
            interactive: true
          },
          pan: {
            interactive: true
          },
          axisLabels: {
            show: true
          },
          xaxis: {
            ticks: 5,
            min: 0,
            //max: 3000
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

        if (eventData) {
          const dataKeys = Object.keys(eventData).filter(key => key !== '_id' && key !== 'request_id');

          dataKeys.forEach(key => {
            const deviceId = key.split('_')[2];
            const dataArray = eventData[key];
            const plotPoints = dataArray.map((val, index) => [index, parseFloat(val)]);

            $.plot($(`#waveform-${deviceId}`), [plotPoints], plotOptions);
          })
        }


      });
    }
  });

});

Template.research.helpers({
  boxEvents() {
    const boxEvents = BoxEvents.find({}, {sort: {eventEnd: -1}});
    return boxEvents;
  },
  eventReqIds() {
    const requestIds = Template.instance().recentEventDataReqIds.get();
    return requestIds;
  },
  isToggledFullEvents() {
    return Template.instance().toggleFullEvents.get();
  },
  isLoadingRecentEventDataReqIds() {
    return Template.instance().isLoadingRecentEventDataReqIds.get();
  },
  selectedEventDeviceIds() {
    const event = EventData.findOne();
    return (event) ? Object.keys(event)
                        .filter(key => key !== '_id' && key !== 'request_id')
                        .map(key => key.split('_')[2]) // Keys are in the form of "events_reqId_deviceId". We are retrieving the deviceId.
                    : null;
  }
});

Template.research.events({
  'click #recent-events tr': function(event) {
    const template = Template.instance();
    const isToggledFullEvents = template.toggleFullEvents.get();
    console.log(isToggledFullEvents);
    console.log(event.currentTarget.id);
    const id = event.currentTarget.id;
    if (isToggledFullEvents) {
      template.selectedEventId.set(null);
      template.selectedEventDataReqId.set(id);
    } else {
      template.selectedEventDataReqId.set(null);
      template.selectedEventId.set(id);
    }
  },
  'click #toggleFullEvents': function(event) {
    const isChecked = $(event.currentTarget).hasClass('checked');
    Template.instance().toggleFullEvents.set(isChecked);
  }
});