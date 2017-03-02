import ld from 'lodash';
import sizeOf from 'object-sizeof';

Template.eventList.onCreated(function() {
  const template = this;

  template.eventFilters = template.data.eventFiltersRef; // Reference to ReactiveVar from parent (publicmonitor.js)
  template.mapFilters = template.data.mapFiltersRef;
  template.selectedEventId = template.data.selectedEventIdRef;
  template.prevSelectedEventId = template.data.prevSelectedEventIdRef;
  template.selectedEventTrigger = template.data.selectedEventTriggerRef;
  template.currentQuery = new ReactiveVar(null, ld.isEqual); // Includes selector and options.
  template.eventCounts = new ReactiveDict(); // {totalEventCount, freqEventCount, voltageEventCount}

  template.currentPage = template.data.currentPageRef; // Initializes at 1 instead of 0. Simplifies page calculations.
  template.totalPages = new ReactiveVar(1);
  template.EVENTS_PER_PAGE = 100;

  // Subscription autorun. Re-runs when filters or page changes.
  template.autorun(function() {
    const eventFilters = template.eventFilters.get();
    const mapFilters = template.mapFilters.get();
    const currentPage = template.currentPage.get();

    if (!!eventFilters && !!mapFilters && !!currentPage) {
      template.selectedEventId.set(null); // Deselect and unsubscribe from currently selected single event.
      template.subscribe("eventsCollection", eventFilters, mapFilters, currentPage - 1, template.EVENTS_PER_PAGE);
    }
  });

  // Re-calculates total event counts (not just current page counts) when filters are changed.
  template.autorun(function() {
    const eventFilters = template.eventFilters.get();
    const mapFilters = template.mapFilters.get();

    if (!!eventFilters && !!mapFilters && template.subscriptionsReady()) {
      Meteor.call("totalEventsCount", eventFilters, mapFilters, function(err, result) {
        if (!!result) {
          template.eventCounts.set(result);
        }
      });
    }
  });

  // Whenever eventFilters or mapFilters change, reset page to 1.
  template.autorun(function() {
    const eventFilters = template.eventFilters.get();
    const mapFilters = template.mapFilters.get();
    let currentPage;
    Tracker.nonreactive(function() {
      currentPage = template.currentPage.get();
    });
    if (!!eventFilters && !!mapFilters && currentPage !== 1) {
      template.currentPage.set(1);
    }
  });

  // Ensures that the currently selected event is highlighted, and previously selected event is un-highlighted.
  template.autorun(function() {
    const selectedEventId = template.selectedEventId.get();
    const prevSelectedEventId = template.prevSelectedEventId.get();

    if (!!selectedEventId) {
      // Remove previous event highlight.
      const prevEventRow = $(`#${prevSelectedEventId}`);
      if (prevEventRow.hasClass('info')) {
        prevEventRow.removeClass('info');
      }

      // Add newly selected event highlight.
      const eventRow = $(`#${selectedEventId}`);
      if (!eventRow.hasClass('info')) {
        eventRow.addClass('info');

        // Now we highlight and center the selected event.
        const eventsPanel = $('#events-table');
        eventsPanel.scrollTop(0); // Bug with Blaze: Offset() doesn't calculate correct value unless we do this first.
        const rowOffset = eventRow.offset().top; // Offset position of selected row.
        const panelHeightMiddle = eventsPanel.height() / 2; // Half of panel body height.
        const extraOffset = 105; // Need this b/c of badge table at top of events panel.

        eventsPanel.scrollTop(rowOffset - panelHeightMiddle - extraOffset); // Scroll to selected row.
      }
    }
  });
});

Template.eventList.onRendered(function() {
  const template = this;

  /**
   * Handles default event selection on:
   * 1. Template initialization (selects top-most event)
   * 2. Previous page changes: prevPageBottom, prevPageTop
   * 3. Next page changes: nextPageTop, nextPageBottom
   */
  template.autorun(function() {
    if (template.subscriptionsReady()) {
      let eventTrigger; // Don't need either of these to be reactive.
      let selectedEventId; // If null, then template just initialized and must select top-most event by default.
      Tracker.nonreactive(function() {
        eventTrigger = template.selectedEventTrigger.get();
        selectedEventId = template.selectedEventId.get();
      });

      if (eventTrigger === 'prevPageBottom' || eventTrigger === 'nextPageBottom') {
        template.selectedEventTrigger.set(null);

        const eventRowProm = jQueryPromise('#events tbody>tr:last', 200, 2000);
        eventRowProm.then((eventRow) => {
          template.selectedEventId.set(eventRow.attr('id'));
        }).catch((error) => {
          console.log(error);
        });
      }
      else if (eventTrigger === 'nextPageTop' || eventTrigger === 'prevPageTop' || !selectedEventId) {
        template.selectedEventTrigger.set(null);

        let eventRowProm = jQueryPromise('#events tbody>tr:first', 200, 2000);
        eventRowProm.then((eventRow) => {
          template.selectedEventId.set(eventRow.attr('id'));
        }).catch((error) => {
          console.log(error);
        });
      }
    }
  });
});



Template.eventList.helpers({
  events() {
    const template = Template.instance();
    const eventFilters = template.eventFilters.get();
    const mapFilters = template.mapFilters.get();

    if (!!eventFilters && !!mapFilters && template.subscriptionsReady()) {
      const {eventsSelector, opqDevicesCursor, locationsCursor} = Global.QueryConstructors.filteredEvents(eventFilters, mapFilters);
      return Events.find(eventsSelector, {fields: {waveform: 0}, sort: {timestamp: -1}});
    }
  },
  getCurrentPage() {
    const template = Template.instance();
    return template.currentPage.get();
  },
  getTotalPages() {
    const template = Template.instance();
    const totalPages = Math.ceil(template.eventCounts.get("totalEventCount") / template.EVENTS_PER_PAGE);
    template.totalPages.set(totalPages);
    return !!totalPages ? totalPages : 1;
  },
  totalEventCount() {
    const template = Template.instance();
    const totalCount = template.eventCounts.get("totalEventCount");
    return !!totalCount ? totalCount : 0;
  },
  freqEventCount() {
    const template = Template.instance();
    const freqCount = template.eventCounts.get("freqEventCount");
    return !!freqCount ? freqCount : 0;
  },
  voltageEventCount() {
    const template = Template.instance();
    const voltageCount = template.eventCounts.get("voltageEventCount");
    return !!voltageCount ? voltageCount : 0;
  }
});



Template.eventList.events({
  'click #prev-page-btn': function(event) {
    const template = Template.instance();
    const currPage = template.currentPage.get();

    if (currPage > 1) {
      template.selectedEventTrigger.set('prevPageTop');
      template.selectedEventId.set(null); // Unsubscribe singleEvent before changing page so doesn't carry over.
      Tracker.afterFlush(function() {
        template.currentPage.set(template.currentPage.get() - 1);
      });
    }

    if (currPage === 2) {
      // On second page, so disable prev-page button on click.
      $(event.currentTarget).prop("disabled", true);
    }

    // Enable next-page button if no longer on last page.
    if (template.$("#next-page-btn").val("disabled")) {
      template.$("#next-page-btn").prop("disabled", false);
    }
  },
  'click #next-page-btn': function(event) {
    const template = Template.instance();
    const currPage = template.currentPage.get();

    if (currPage < template.totalPages.get()) {
      template.selectedEventTrigger.set('nextPageTop');
      template.selectedEventId.set(null); // Unsubscribe singleEvent before changing page so doesn't carry over.
      Tracker.afterFlush(function() {
        template.currentPage.set(template.currentPage.get() + 1);
      });
    }

    if (currPage === template.totalPages.get() - 1) {
      // On second to last page, so disable next-page button on click.
      $(event.currentTarget).prop("disabled", true);
    }

    // Enable prev-page button if no longer on first page.
    if (template.$("#prev-page-btn").val("disabled")) {
      template.$("#prev-page-btn").prop("disabled", false);
    }
  },
  'click #events tr': function(event) {
    const template = Template.instance();
    const oldSelectedEventId = template.selectedEventId.get();

    // First store previous selected event id.
    template.prevSelectedEventId.set(oldSelectedEventId);

    // Just for clarification: the event args is a javascript event, not OPQ event. Event.currentTarget.id is grabbing
    // the table row's id value, which happens to be the OPQ event's Mongo ID.
    const eventId = event.currentTarget.id;
    template.selectedEventId.set(eventId);
  }
});