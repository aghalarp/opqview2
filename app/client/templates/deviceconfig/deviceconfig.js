Template.deviceconfig.onCreated(function() {
  const template = this;
  template.flashAlert = new ReactiveVar(); // {message, type, expireAt}

  template.gridMap = null;

  // Subscription autorun
  template.autorun(function() {
    const deviceId = FlowRouter.getParam('deviceId');
    template.subscribe('opqDeviceWithLocation', deviceId); // Publishes single OpqDevice corresponding Location.
  });

  // Handles initialization and updating of the grid map.
  template.autorun(function() {
    const opqDevice = OpqDevices.findOne();
    const location = Locations.findOne();

    if (opqDevice && template.subscriptionsReady()) {
      // Calculate values for map orientation.
      let latLng, zoom;
      if (location && location.gridId.length > 0 && location.gridScale !== null && location.northEastLatitude !== null && location.northEastLongitude !== null) { // Note: !== null checks for both null and undefined.
        latLng = [(parseFloat(location.northEastLatitude) + parseFloat(location.southWestLatitude)) / 2,
                  (parseFloat(location.northEastLongitude) + parseFloat(location.southWestLongitude)) / 2];
        zoom = grid.getZoomByDistance(parseFloat(location.gridScale));
      } else {
        latLng = grid.island.OAHU.latLng;
        zoom = grid.island.OAHU.defaultZoom;
        console.log(latLng, zoom);
      }

      // Init map if not created yet.
      if (!template.gridMap) {
        template.gridMap = grid;
        template.gridMap.config.singleSelectionMode = true;
        template.gridMap.callbacks.onGridClick = function(feature, layer) {
          $('#gridId').val(feature.properties.id);
          $('#northEastLatitude').val(feature.properties.boundingBox.getNorthEast().lat);
          $('#northEastLongitude').val(feature.properties.boundingBox.getNorthEast().lng);
          $('#southWestLatitude').val(feature.properties.boundingBox.getSouthWest().lat);
          $('#southWestLongitude').val(feature.properties.boundingBox.getSouthWest().lng);
          $('#gridScale').val(feature.properties.scale);
          $('#gridRow').val(feature.properties.row);
          $('#gridCol').val(feature.properties.col);

          template.gridMap.colorSquare(feature.properties.id, "red");
        };

        template.gridMap.initMap("grid-map", latLng, zoom);
        //template.gridMap.colorSquare(location.gridId, "red");

      } else {
        // If map already initialized, just update the view.
        template.gridMap.setView(latLng, zoom);
        //template.gridMap.colorSquare(location.gridId, "red");
      }

      if (location && location.gridId) template.gridMap.colorSquare(location.gridId, "red");
    }
  });
});

Template.deviceconfig.helpers({
  deviceConfigFormSchema() {
    return Global.Schemas.DeviceadminForm;
  },
  deviceConfigFormDoc() {
    const template = Template.instance();
    const userId = Meteor.userId();
    const deviceId = FlowRouter.getParam('deviceId');

    if (template.subscriptionsReady()) {
      const {opqDeviceSelector, locationCursor, personCursor} = Global.QueryConstructors.opqDeviceWithLocation(deviceId, userId);
      // const device = opqDeviceSelector.fetch()[0];
      const device = OpqDevices.findOne(opqDeviceSelector);
      const location = locationCursor.fetch()[0];

      // Combine device and location documents, also creating additional _id fields for each doc.
      let formDoc = _.extend({
        device_id: device._id.toHexString()
      }, device);

      // We separately extend location doc because location will not always exist (eg. new devices).
      if (location) {
        formDoc = _.extend({
          location_id: location._id.toHexString()
        }, formDoc, location);
      }

      // _id is irrelevant here because we've combined two collection documents, both of which have their own _ids.
      delete formDoc._id;

      return formDoc;
    }
  }
});


AutoForm.hooks({
  deviceconfigForm: {
    onSubmit: function(insertDoc, updateDoc, currentDoc) {
      const self = this;

      Meteor.call('saveDeviceConfiguration', insertDoc, function(error, result) {
        if (error) {
          console.log(error);
          self.formAttributes.templateInstance.flashAlert.set({
            message: error.reason,
            type: 'danger',
            expireAt: Date.now() + (10 * 1000) // 10s from now.
          });
          self.done(error);
        } else {
          console.log(result);
          self.formAttributes.templateInstance.flashAlert.set({
            message: 'Device settings updated!',
            type: 'success',
            expireAt: Date.now() + (10 * 1000) // 10s from now.
          });
          self.done();
        }
      });

      return false; // Equivalent to event.preventDefault(). Stops actual form submission.
    }
  }
});