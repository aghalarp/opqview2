//import flot from 'flot-charts';

Template.measurements.onCreated(function() {
  const template = this;

  template.measurementStartTimeSecondsAgo = ReactiveVar(60);
  template.snapshotRequest = ReactiveVar();
  template.snapshotResultData = ReactiveVar();
  template.snapshotLoading = ReactiveVar(false);
  template.snapshotVoltFreqToggle = ReactiveVar('voltage');
  template.selectedDeviceId = ReactiveVar();

  template.autorun(function() {
    //const selectedDeviceId = template.selectedDeviceId.get();
    const secondsAgo = template.measurementStartTimeSecondsAgo.get();
    if (secondsAgo) {
      template.subscribe('measurements', secondsAgo);
    }
  });


  template.autorun(function() {
    if (template.subscriptionsReady()) {
      const selectedDeviceId = template.selectedDeviceId.get();
      const selector = (selectedDeviceId) ? {device_id: selectedDeviceId} : {};
      const measurements = Measurements.find(selector, {sort: {timestamp_ms: 1}});

      //const xaxisTickSize = measurements.count() / 9;
      const timeZoneOffset = new Date().getTimezoneOffset() * 60 * 1000; // Positive if -UTC, negative if +UTC.

      if (measurements.count()) {
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
      const prom = jQueryPromise('#1m', 200, 2000);
      prom.then(button => {
        button.addClass('active');
      }).catch((error) => {
        console.log(error);
      });
      init1minButton = false;
    }
  });

  let initVoltageSnapshotButton = true;
  template.autorun(function() {
    if (initVoltageSnapshotButton && template.subscriptionsReady()) {
      const prom = jQueryPromise('#voltageSnapshotToggle', 200, 2000);
      prom.then(button => {
        button.addClass('active');
      }).catch((error) => {
        console.log(error);
      });
      initVoltageSnapshotButton = false;
    }
  });



  //template.autorun(function() {
  //  if (template.subscriptionsReady()) {
  //    Tracker.afterFlush(function() {
  //      $('#1m').addClass('active');
  //    });
  //  }
  //});

});

Template.measurements.helpers({
  measurements() {
    const template = Template.instance();

    if (template.subscriptionsReady()) {
      const selectedDeviceId = template.selectedDeviceId.get();
      const selector = (selectedDeviceId) ? {device_id: selectedDeviceId} : {};
      const measurements = Measurements.find(selector, {sort: {timestamp_ms: -1}});

      return measurements;
    }
  },
  newestMeasurement() {
    const template = Template.instance();

    if (template.subscriptionsReady) {
      const selectedDeviceId = template.selectedDeviceId.get();
      const selector = (selectedDeviceId) ? {device_id: selectedDeviceId} : {};
      const measurement = Measurements.findOne(selector, {sort: {timestamp_ms: -1}});
      return measurement;
    }
  },
  snapshotLoading() {
    return Template.instance().snapshotLoading.get();
  },
  deviceStatus() {
    const template = Template.instance();

    if (template.subscriptionsReady()) {
      const selectedDeviceId = template.selectedDeviceId.get();
      const selector = (selectedDeviceId) ? {device_id: selectedDeviceId} : {};
      return (Measurements.find(selector).count() > 0) ? 'Device online' : 'Device offline';
    }
  },
  deviceIds() {
    const template = Template.instance();

    if (template.subscriptionsReady()) {
      const measurements = Measurements.find({}, {
        fields: {device_id: 1},
        sort: {device_id: 1}
      }).fetch();
      return _.uniq(_.pluck(measurements, 'device_id'));
    }
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
    $('#deviceSelection > button.active').removeClass('active');
    $(`#device-${deviceId}`).addClass('active');
    template.selectedDeviceId.set(deviceId);
  }
});