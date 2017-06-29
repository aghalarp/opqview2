import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveVar } from 'meteor/reactive-var';
import SimulatedEvents from '../../../api/simulatedEvents/simulatedEvents.js';

// Templates and Sub-Template Inclusions
import './measurements.html';
import '../../components/liveMeasurements/liveMeasurements.js';
import '../../components/map/map.js';
// import '../../components/flashMessage/flashMessage.js';
// import { flashMessageConstructor } from '../../components/flashMessage/flashMessage.js';



Template.measurements.onCreated(function() {
  const template = this;
  //template.flashMessage = new ReactiveVar(createFlashMessageMsgObject('positive', 10, 'Test body message', '', 'feed'));
  // flashMessageConstructor(this);

  template.selectedEventId = new ReactiveVar();

  template.autorun(() => {
    Meteor.subscribe('simulatedEvents', 60);
  });

});

Template.measurements.onRendered(function() {
  const template = this;

  // // Init main-map
  // L.Icon.Default.imagePath = '/packages/bevanhunt_leaflet/images/';
  // template.mainMap = L.map('main-map').setView([21.466700, -157.983300], 10);
  // template.markerLayerGroup = L.layerGroup([]);
  //
  // const osmUrl = "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  // const osmAttrib = "Map data © OpenStreetMap contributors";
  // const osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});
  // template.mainMap.addLayer(osm);

  // Plots waveform whenever an event is selected.
  template.autorun(function() {
    const selectedEventId = template.selectedEventId.get();

    if (selectedEventId && template.subscriptionsReady()) {
      Tracker.afterFlush(function() {
        const waveformData = SimulatedEvents.findOne({_id: new Mongo.ObjectID(selectedEventId)}).waveform;

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

Template.measurements.helpers({
  simEvents() {
    const template = Template.instance();
    const events = SimulatedEvents.find({timestamp_ms: {$gte: Date.now() - 60000}}, {sort: {timestamp_ms: -1}});
    return events;
  },
  selectedEvent() {
    const template = Template.instance();

    const selectedEventId = template.selectedEventId.get();
    const event = SimulatedEvents.findOne({_id: new Mongo.ObjectID(selectedEventId)});

    if (selectedEventId && event && template.subscriptionsReady()) {
      return event;
    }
  },
  formatCoords(coords) {
    console.log(coords);
  },
  getIticBadge: function(itic) {
    let badge;

    switch (itic) {
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

Template.measurements.events({
  'click #recent-events tr': function(event) {
    const template = Template.instance();
    console.log(event.currentTarget.id);
    const id = event.currentTarget.id;
    template.selectedEventId.set(id);
  },
  'click td a.coords': function(event) {
    const lat = $(event.currentTarget).attr('lat');
    const lng = $(event.currentTarget).attr('lng');

    L.map('main-map').flyTo([lat, lng], 13);

  }
});