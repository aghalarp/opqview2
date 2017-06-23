Template.event.helpers({
  /**
   * Retrieves the proper event_type name of the currently invoked Event.
   *
   * @this {Event}
   * @returns {string} The event_type string name.
   */
  eventType() {
    return Global.Enums.EventTypes.getName(this.event_type);
  },
  /**
   * Retrieves and formats the event's frequency or voltage value.
   *
   * @this {Event}
   * @returns {string} The formatted event value.
   */
  formattedValue() {
    if (this.event_type == Global.Enums.EventTypes.EVENT_FREQUENCY && !!this.frequency) {
      return `${this.frequency.toFixed(2)} Hz`;
    }
    else if (this.event_type == Global.Enums.EventTypes.EVENT_VOLTAGE && !!this.voltage) {
      return `${this.voltage.toFixed(1)} V`; // Just round to 1 decimal place for voltages.
    }
  },
  iticBadge: function() {
    let badge;
    const iticRegion = Global.Utils.PqUtils.getIticRegion(this.duration * 1000, this.voltage); // Ask Anthony why we multiply by 1000 here.

    switch (iticRegion) {
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

Template.event.events({
  //'click tr': function(event) {
  //  var eventId = event.currentTarget.id; //Grabs the TR id value, which is the event id.
  //  Session.set("selectedEvent", eventId);
  //}
});