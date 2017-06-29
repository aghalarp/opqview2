import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

Persons = new Mongo.Collection("persons", {idGeneration: "MONGO"});

// Create and attach schema for this collection
PersonsSchema = new SimpleSchema({
  userId: { // Reference to Users. (From Meteor's Accounts-Password package.)
    type: String,
    regEx: SimpleSchema.RegEx.Id // Meteor's string ID, not Mongo's ObjectID.
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  }
});

Persons.attachSchema(PersonsSchema);

export default Persons;