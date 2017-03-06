//import flot from 'flot-charts';

Template.measurements.onCreated(function() {
  const template = this;

  template.measurementStartTimeSecondsAgo = ReactiveVar(60);
  template.snapshotRequest = ReactiveVar();
  template.snapshotResultData = ReactiveVar();
  template.snapshotLoading = ReactiveVar(false);
  template.snapshotVoltFreqToggle = ReactiveVar('voltage');
  template.selectedDeviceId = ReactiveVar();
  template.activeDeviceIds = ReactiveVar();


  // Check for active devices, handles initial/default device selection.
  template.autorun(function() {
    const selectedDeviceId = template.selectedDeviceId.get();

    if (template.subscriptionsReady()) {
      Meteor.call('getActiveDeviceIds', Date.now() - (60 * 1000), function(err, deviceIds) {
        if (err) console.log(err);
        if (deviceIds && deviceIds.length > 0) {
          template.activeDeviceIds.set(deviceIds);
          if (!selectedDeviceId) template.selectedDeviceId.set(deviceIds[0]); // Select first device by default.
        }
      });
    }
  });

  // Subscription
  template.autorun(function() {
    const selectedDeviceId = template.selectedDeviceId.get();
    const secondsAgo = template.measurementStartTimeSecondsAgo.get();

    if (secondsAgo && selectedDeviceId) {
      Meteor.subscribe('measurements', secondsAgo, selectedDeviceId);
    }
  });

  // Ensures selected device is highlighted.
  template.autorun(function() {
    const selectedDeviceId = template.selectedDeviceId.get();

    if (selectedDeviceId && template.subscriptionsReady()) {
      // Un-highlight old device, highlight new device.
      jQueryPromise('#deviceSelection > button.active', 200, 2000)
          .then(deviceBtn => deviceBtn.removeClass('active'))
          .catch(error => console.log(error));

      jQueryPromise(`#device-${selectedDeviceId}`, 200, 2000)
          .then(deviceBtn => deviceBtn.addClass('active'))
          .catch(error => console.log(error));
    }
  });

  // Handles graph plotting.
  template.autorun(function() {
    const selectedDeviceId = template.selectedDeviceId.get();
    const measurementStartTimeSecondsAgo = template.measurementStartTimeSecondsAgo.get();
    const timeZoneOffset = new Date().getTimezoneOffset() * 60 * 1000; // Positive if -UTC, negative if +UTC.

    if (selectedDeviceId && template.subscriptionsReady()) {
      // Note on the filter: Although the publication is supposed to send removal calls to the client on measurements
      // outside of the startTime range, it seems that once in a while these messages get lost over the wire.
      // Consequently, the server believes the measurement has been removed, while the client collection still holds it,
      // resulting in the plot displaying data outside of the intended time range (which gets worse over time).
      // The simple solution is to filter on the client side and ensure we are only displaying data within the intended
      // time frame.
      // Also of note: It's much faster to simply filter() on the resulting mongo query result, rather than to query
      // with {timestamp_ms: {$gte: startTime}}. Meteor's Minimongo implementation isn't very efficient.
      const startTime = Date.now() - (measurementStartTimeSecondsAgo * 1000);
      const measurements = Measurements.find({device_id: selectedDeviceId}, {sort: {timestamp_ms: 1}})
          .fetch()
          .filter(measurement => measurement.timestamp_ms >= startTime);

      if (measurements.length > 0) {
        const voltages = measurements.map(data => {
          return [data.timestamp_ms - timeZoneOffset, data.voltage];
        });

        const frequencies = measurements.map(data => {
          return [data.timestamp_ms - timeZoneOffset, data.frequency];
        });

        $.plot('#voltagePlot', [voltages], {
          xaxis: {
            mode: 'time',
            timeformat: '%H:%M:%S'
          }
        });

        $.plot('#freqPlot', [frequencies], {
          xaxis: {
            mode: 'time',
            timeformat: '%H:%M:%S'
          }
        });

        $.plot('#miniVoltagePlot', [voltages], {
          xaxis: {
            mode: 'time',
            timeformat: '%H:%M:%S'
          },
          yaxis: {
            tickDecimals: 2
          }
        });

        $.plot('#miniFreqPlot', [frequencies], {
          xaxis: {
            mode: 'time',
            timeformat: '%H:%M:%S'
          },
          yaxis: {
            tickDecimals: 3
          }
        });
      }
    }
  });

  // Handles measurement snapshot calls.
  template.autorun(function() {
    const snapshotStartTimestamp = template.snapshotRequest.get();

    if (snapshotStartTimestamp) {
      template.snapshotLoading.set(true);
      Meteor.call('getSnapshot', snapshotStartTimestamp, function(err, result) {
        template.snapshotLoading.set(false);
        if (err) {
          console.log(err);
        } else {
          console.log(result);
          template.snapshotResultData.set(result);
        }
      });
    }
  });

  // Handles measurement snapshot plotting.
  template.autorun(function() {
    const snapshotData = template.snapshotResultData.get();
    const voltFreqToggle = template.snapshotVoltFreqToggle.get();

    if (snapshotData && voltFreqToggle) {
      //const timeZoneOffset = new Date().getTimezoneOffset() * 60 * 1000; // Positive if -UTC, negative if +UTC.
      let plotData;
      switch (voltFreqToggle) {
        case 'voltage':
          plotData = snapshotData.map(measurement => {
            return [measurement.timestamp_ms, measurement.voltage];
          });
          break;
        case 'frequency':
          plotData = snapshotData.map(measurement => {
            return [measurement.timestamp_ms, measurement.frequency];
          });
          break;
      }

      // Need to wait for loading template to be replaced by plot div before attempting to call plotting function.
      const prom = jQueryPromise('#voltagePlotSnapshot', 200, 2000);
      prom.then(() => {
        $.plot('#voltagePlotSnapshot', [plotData], {
          xaxis: {
            mode: 'time',
            timeformat: '%H:%M:%S'
          }
        });

      });

    }
  })
});

Template.measurements.onRendered(function() {
  const template = this;

  let init1minButton = true;
  template.autorun(function() {
    if (init1minButton && template.subscriptionsReady()) {
      jQueryPromise('#1m', 200, 2000)
          .then(button => button.addClass('active'))
          .catch(error => console.log(error));

      init1minButton = false;
    }
  });

  let initVoltageSnapshotButton = true;
  template.autorun(function() {
    if (initVoltageSnapshotButton && template.subscriptionsReady()) {
      jQueryPromise('#voltageSnapshotToggle', 200, 2000)
          .then(button => button.addClass('active'))
          .catch(error => console.log(error));

      initVoltageSnapshotButton = false;
    }
  });

});

Template.measurements.helpers({
  measurements() {
    const template = Template.instance();
    const selectedDeviceId = template.selectedDeviceId.get();

    if (selectedDeviceId && template.subscriptionsReady()) {
      const measurements = Measurements.find({device_id: selectedDeviceId}, {sort: {timestamp_ms: -1}, limit: 10});
      return measurements;
    }
  },
  newestMeasurement() {
    const template = Template.instance();
    const selectedDeviceId = template.selectedDeviceId.get();

    if (selectedDeviceId && template.subscriptionsReady()) {
      const measurement = Measurements.findOne({device_id: selectedDeviceId}, {sort: {timestamp_ms: -1}});
      return measurement;
    }
  },
  snapshotLoading() {
    return Template.instance().snapshotLoading.get();
  },
  deviceIds() {
    const template = Template.instance();
    const activeDeviceIds = template.activeDeviceIds.get();

    return (activeDeviceIds && activeDeviceIds.length > 0) ? activeDeviceIds : null;
  },
  deviceStatus() {
    const template = Template.instance();
    const activeDeviceIds = template.activeDeviceIds.get();
    return (activeDeviceIds && activeDeviceIds.length > 0) ? 'Device Online' : 'Device Offline';
  }
});

Template.measurements.events({
  'click #1m': function(event) {
    const template = Template.instance();
    $('#1m').addClass('active');
    $('#5m').removeClass('active');
    $('#10m').removeClass('active');
    template.measurementStartTimeSecondsAgo.set(60);
  },
  'click #5m': function(event) {
    const template = Template.instance();
    $('#5m').addClass('active');
    $('#1m').removeClass('active');
    $('#10m').removeClass('active');
    template.measurementStartTimeSecondsAgo.set(60 * 5);

  },
  'click #10m': function(event) {
    const template = Template.instance();
    $('#10m').addClass('active');
    $('#1m').removeClass('active');
    $('#5m').removeClass('active');
    template.measurementStartTimeSecondsAgo.set(60 * 10);
  },
  'click #1d': function(event) {
    const template = Template.instance();
    $('#1d').addClass('active');
    $('#3d').removeClass('active');
    $('#7d').removeClass('active');
    template.snapshotRequest.set(Date.now() - (60*60*24 * 1000)); // 1 day.
  },
  'click #3d': function(event) {
    const template = Template.instance();
    $('#3d').addClass('active');
    $('#1d').removeClass('active');
    $('#7d').removeClass('active');
    template.snapshotRequest.set(Date.now() - (60*60*24*3 * 1000)); // 3 days.
  },
  'click #7d': function(event) {
    const template = Template.instance();
    $('#7d').addClass('active');
    $('#1d').removeClass('active');
    $('#3d').removeClass('active');
    template.snapshotRequest.set(Date.now() - (60*60*24*7 * 1000)); // 1 week.
  },
  'click #voltageSnapshotToggle': function() {
    const template = Template.instance();
    $('#voltageSnapshotToggle').addClass('active');
    $('#freqSnapshotToggle').removeClass('active');
    template.snapshotVoltFreqToggle.set('voltage');
  },
  'click #freqSnapshotToggle': function() {
    const template = Template.instance();
    $('#freqSnapshotToggle').addClass('active');
    $('#voltageSnapshotToggle').removeClass('active');
    template.snapshotVoltFreqToggle.set('frequency');
  },
  'click #deviceSelection button': function(event) {
    const template = Template.instance();
    const deviceId = Number(event.currentTarget.id.replace('device-', ''));
    // $('#deviceSelection > button.active').removeClass('active');
    // $(`#device-${deviceId}`).addClass('active');
    template.selectedDeviceId.set(deviceId);
  }
});