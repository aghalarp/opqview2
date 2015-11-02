Template.event.helpers({
  valueType: function() {
    return this.event_type == "frequency" ? "Hz" : "V";
  },
  iticBadge: function() {
    var badge;

    switch (this.itic) {
      case "ok":
        badge = "itic-no-interruption";
        break;
      case "moderate":
        badge = "itic-no-damage";
        break;
      case "severe":
        badge = "itic-prohibited";
        break;
      default:
        badge = "N/A"
        break;
    }

    return badge;
  }
});