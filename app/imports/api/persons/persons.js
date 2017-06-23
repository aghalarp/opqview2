Persons = new Mongo.Collection("persons", {idGeneration: "MONGO"});

// Create and attach schema for this collection
PersonsSchema = new SimpleSchema({
  userId: { // Reference to Users. (From Meteor's Accounts-Password package.)
    type: String,
    regEx: SimpleSchema.RegEx.Id // Meteor's string ID, not Mongo's ObjectID.
  },
  opqDevices: { // Reference to OpqDevices. Many-to-Many relationship. (Quick thought: Do we want to store MongoIDs, or deviceIDs?)
    type: [Mongo.ObjectID],
    optional: true
  },
  firstName: {
    type: String,
    label: "First Name *"
  },
  lastName: {
    type: String,
    label: "Last Name *"
  },
  alertEmail: {
    type: String,
    label: "Alert E-mail",
    optional: true,
    regEx: SimpleSchema.RegEx.Email
  },
  smsCarrier: {
    type: String,
    label: "SMS Carrier",
    allowedValues: Global.Enums.SmsCarriers.listEnumValues(),
    autoform: {
      options: function() {
        return Global.Enums.SmsCarriers.listEnumKeys().map(enumKey => {
          let enumeration = Global.Enums.SmsCarriers[enumKey];
          return {label: Global.Enums.SmsCarriers.getName(enumeration), value: enumeration}
        });
      }
    },
    optional: true
  },
  smsNumber: {
    type: String,
    label: "SMS Number",
    optional: true
  },
  enableSmsAlerts: {
    type: Boolean,
    label: "SMS Alerts",
    allowedValues: [true, false],
    defaultValue: false,
    optional: true
  },
  iticRegionSmsThreshold: {
    type: String,
    label: "SMS ITIC Threshold",
    allowedValues: ["moderate", "severe"],
    autoform: {
      options: [
        {label: "Moderate", value: "moderate"},
        {label: "Severe", value: "severe"}
      ]
    },
    defaultValue: "moderate",
    optional: true
  },
  enableEmailNotifications: {
    type: Boolean,
    label: "E-mail Notifications",
    allowedValues: [true, false],
    defaultValue: false,
    optional: true
  },
  enableEmailSummaryNotifications: {
    type: Boolean,
    label: "Summary",
    defaultValue: false,
    optional: true
  },
  enableEmailAlertNotifications: {
    type: Boolean,
    label: "Alerts",
    defaultValue: false,
    optional: true
  },
  enableEmailSummaryDaily: {
    type: Boolean,
    label: "Daily",
    defaultValue: false,
    optional: true
  },
  enableEmailSummaryWeekly: {
    type: Boolean,
    label: "Weekly",
    defaultValue: false,
    optional: true
  },
  iticRegionEmailThreshold: {
    type: String,
    label: "E-mail ITIC Threshold",
    allowedValues: ["moderate", "severe"],
    autoform: {
      options: [
        {label: "Moderate", value: "moderate"},
        {label: "Severe", value: "severe"}
      ]
    },
    defaultValue: "moderate",
    optional: true
  }
});

Persons.attachSchema(PersonsSchema);


Meteor.methods({
  insertPerson(person) {
    check(person, Persons.simpleSchema());

    // Make sure userId exists before inserting.
    if (!Meteor.users.findOne({_id: person.userId})) {
      throw new Meteor.Error('persons.insertPerson.noUser' ,'User Id does not exist.');
    }

    return Persons.insert(person); // Document id is returned on success.
  },
  updatePerson(personModifier) {
    // Validate against schema. No need to check the $unset portion, because we're simply removing it.
    check(personModifier.$set, Persons.simpleSchema());

    if (!Persons.findOne({_id: personModifier.id})) {
      throw new Meteor.Error('persons.updatePerson.noPerson', 'Person does not exist.');
    }

    return Persons.update(
        {_id: personModifier.id},
        {
          $set: personModifier.$set,
          $unset: personModifier.$unset
        }
    );
  },
  addDeviceToPerson(user_id, device_id) {
    check(user_id, String);
    check(device_id, String);

    const userId = this.userId;
    if (userId !== user_id) throw new Meteor.Error('persons.addDeviceToPerson.userMismatch', 'Logged in user does not match user invoking method call.');

    const device = OpqDevices.findOne({_id: new Mongo.ObjectID(device_id)});
    if (!device) throw new Meteor.Error('persons.addDeviceToPerson.invalidDevice', 'Device does not exist.');

    const person = Persons.findOne({userId: userId});
    if (person) {
      // Push deviceId to Person, and push personId to Device.
      const personResult = Persons.update({_id: person._id}, {$push: {opqDevices: device._id}});
      const deviceResult = OpqDevices.update({_id: device._id}, {$push: {persons: person._id}});

      return 'Device successfully linked.';
      if (personResult === 1 && deviceResult === 1) {
        return 'Device successfully linked!';
      }
    }

    return 'Unable to link device.';
  }
});

export const getPersonIdByUserId = (userId) => {
  return Persons.findOne({userId: userId})._id;
};

