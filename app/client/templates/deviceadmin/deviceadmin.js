// Create client-only collection outside of template to ensure collection only created once.
EventCounts = new Mongo.Collection('eventCounts');

Template.deviceadmin.onCreated(function() {
  const template = this;

  template.EventCounts = EventCounts; // Store db reference to template. Maybe unnecessary...

  template.autorun(function() {
    template.subscribe('userOpqDevices');
    template.subscribe('publicOpqDevices');
    template.subscribe('opqDeviceEventCounts', 'eventCounts');
  });

  template.autorun(function() {
    template.EventCounts.find({}).observeChanges({
      changed: function(id, fields) {
        // Flash the effected row. Bootstrap doesn't play nicely with styling table rows, so we instead have to
        // style each child td of the targeted row.
        $(`#${id.toHexString()} > td`).addClass('success').removeClass('success', 3000);

        // Flash the effected fields.
        Object.keys(fields).forEach(field => {
          const prevColor = $(`#${id.toHexString()} > td#${field}`).css('color'); // For changing back to original color.
          $(`#${id.toHexString()} > td#${field}`).css('color', 'red').animate({color: prevColor}, 6000);
        });

      }
    });
  });
});

Template.deviceadmin.helpers({
  userDevices() {
    const template = Template.instance();
    const userId = Meteor.userId();

    if (template.subscriptionsReady()) {
      const {opqDevicesSelector, personCursor} = Global.QueryConstructors.userOpqDevices(userId);
      const devices = OpqDevices.find(opqDevicesSelector);
      const devicesWithEventCount = devices.map(device => {
        const eventCount = template.EventCounts.findOne({_id: device._id});
        device.freqCount = (eventCount) ? eventCount.freqCount : 0;
        device.voltCount = (eventCount) ? eventCount.voltCount : 0;
        return device;
      });

      return devicesWithEventCount;
    }

    return null;
  },
  publicDevices() {
    const template = Template.instance();
    const userId = Meteor.userId();

    if (template.subscriptionsReady()) {
      const {opqDevicesSelector, personCursor} = Global.QueryConstructors.publicOpqDevices(userId);
      const devices = OpqDevices.find(opqDevicesSelector);
      const devicesWithEventCount = devices.map(device => {
        const eventCount = template.EventCounts.findOne({_id: device._id});
        device.freqCount = (eventCount) ? eventCount.freqCount : 0;
        device.voltCount = (eventCount) ? eventCount.voltCount : 0;
        return device;
      });

      return devicesWithEventCount;
    }

    return null;
  },
  lastHeartbeatColor(heartbeatMillis) {
    // Last Heartbeat is considered 'recent' if it was received within the last 5 minutes.
    return (Date.now() - heartbeatMillis <= 300000) ? 'color: green' : 'color: red';
  },
  opqBoxSchema() {
    return Global.Schemas.AddOpqBox;
  },
  pathForDeviceConfig(deviceId) {
    const params = {
      deviceId: deviceId
    };
    return FlowRouter.path('deviceconfigRoute', params);
  }
});

Template.deviceadmin.events({
  'click .linkDevice'(event) {
    const target = event.currentTarget;
    const device_id = target.id;
    const currentUserId = Meteor.userId();
    Meteor.call('addDeviceToPerson', currentUserId, device_id, function(err, result) {
      if (err) {
        console.log(err);
      }
      console.log(result);
    });

  }
});