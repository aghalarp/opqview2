import ld from 'lodash';

Template.publicmonitor.onCreated(function() {
  this.eventFilters = new ReactiveVar(null, ld.isEqual); // To hold event filter form data.
  this.mapFilters = new ReactiveVar(null, ld.isEqual); // To hold map filter data.
  this.selectedEventId = new ReactiveVar(); // To hold currently selected event id.
  this.prevSelectedEventId = new ReactiveVar(); // Holds previously selected event id.
  this.selectedEventTrigger = new ReactiveVar(); // The type of event change.
  this.currentPage = new ReactiveVar(1);

});

Template.publicmonitor.helpers({
  getEventFiltersReference() {
    return Template.instance().eventFilters;
  },
  getMapFiltersReference() {
    return Template.instance().mapFilters;
  },
  getSelectedEventIdReference() {
    return Template.instance().selectedEventId;
  },
  getPrevSelectedEventIdReference() {
    return Template.instance().prevSelectedEventId;
  },
  getSelectedEventTriggerReference() {
    return Template.instance().selectedEventTrigger;
  },
  getCurrentPageReference() {
    return Template.instance().currentPage;
  }
});