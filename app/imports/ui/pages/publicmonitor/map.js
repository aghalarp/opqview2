import { mapify } from 'es6-mapify';

Template.map.onCreated(function() {
  const template = this;

  template.mapFilters = template.data.mapFiltersRef;
  template.eventFilters = template.data.eventFiltersRef;
  template.gridMap = null;

  // Set default map variables.
  template.mapFilters.set({
    mapCenterLat: 21.466700,
    mapCenterLng: -157.983300,
    mapZoom: 8,
    mapVisibleIds: "0,0:0;0,0:1;0,1:0;0,1:1;0,2:0;0,2:1;0,3:0;0,3:1;0,0:3;0,0:2;" +
      "0,1:3;0,1:2;0,2:3;0,2:2;0,3:3;0,3:2;1,0:0;1,0:1;1,1:0;1,1:1;1,2:0;1,2:1;1,3:0;1,3:1;1,0:3;1,0:2;1,1:3;" +
      "1,1:2;1,2:3;1,2:2;1,3:3;1,3:2;2,0:0;2,0:1;2,1:0;2,1:1;2,2:0;2,2:1;2,3:0;2,3:1;2,4:0"
  });

  template.autorun(function() {
    const eventFilters = template.eventFilters.get();
    const mapFilters = template.mapFilters.get();

    if (!!eventFilters && !!mapFilters && template.subscriptionsReady()) {
      // Initialize map if does not yet exist.
      if (!template.gridMap) {
        grid.initMap("public-map", [mapFilters.mapCenterLat, mapFilters.mapCenterLng], mapFilters.mapZoom);
        template.gridMap = grid;
        template.gridMap.callbacks.onMapChange = function() {
          template.mapFilters.set({
            mapCenterLat: template.gridMap.getCenterLat(),
            mapCenterLng: template.gridMap.getCenterLng(),
            mapZoom: template.gridMap.getZoom(),
            mapVisibleIds: template.gridMap.getVisibleIds().join(';')
          });
        };
      } else {
        grid.redrawMap(); // Clear map event numbers before adding new values.
      }

      // Add event itic numbers to map.
      Meteor.call('eventMapCount', eventFilters, mapFilters, function(err, gridIdEventCountsMap) {
        if (err) {
          console.log(`eventMapCount method call failed: ${err}`);
        } else {
          const eventCountsMap = mapify(gridIdEventCountsMap); // gridIdEventCountsMap was demapified before being sent over wire.
          eventCountsMap.forEach((eventCount, truncatedGridId) => { // (val, key)
            grid.addEventNumbers(truncatedGridId, eventCount.get('severeEvents'), eventCount.get('moderateEvents'), eventCount.get('okEvents'));
          });
        }
      });
    }
  });

});

Template.map.onRendered(function() {
  const template = this;

});

Template.map.helpers({

});