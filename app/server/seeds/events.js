// Automatically runs on server start.

if (Events.find().count() === 0) {
  var now = new Date().getTime();

  Events.insert({
    timestamp: new Date(now),
    duration: 16,
    event_type: "frequency",
    value: 40.27,
    itic: "ok"
  });

  Events.insert({
    timestamp: new Date(now - 5 * 3600 * 1000),
    duration: 13,
    event_type: "frequency",
    value: 40.65,
    itic: "ok"
  });

  Events.insert({
    timestamp: new Date(now - 3 * 3600 * 1000),
    duration: 14,
    event_type: "frequency",
    value: 40.03,
    itic: "ok"
  });

  Events.insert({
    timestamp: new Date(now - 4 * 3600 * 1000),
    duration: 15,
    event_type: "frequency",
    value: 74.27,
    itic: "moderate"
  });

  Events.insert({
    timestamp: new Date(now - 8 * 3600 * 1000),
    duration: 6,
    event_type: "frequency",
    value: 140.65,
    itic: "moderate"
  });

  Events.insert({
    timestamp: new Date(now - 9 * 3600 * 1000),
    duration: 4,
    event_type: "frequency",
    value: 440.65,
    itic: "severe"
  });

  Events.insert({
    timestamp: new Date(now - 12 * 3600 * 1000),
    duration: 16,
    event_type: "voltage",
    value: 220.42,
    itic: "severe"
  });

  Events.insert({
    timestamp: new Date(now - 15 * 3600 * 1000),
    duration: 14,
    event_type: "voltage",
    value: 249.22,
    itic: "moderate"
  });

}