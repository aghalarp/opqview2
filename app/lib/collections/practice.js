Practice = new Mongo.Collection("practice");

// Create and attach schema for this collection
PracticeSchema = new SimpleSchema({
  name: {
    type: String,
    max: 20
  },
  address: {
    type: String,
    max: 50
  }
});

Practice.attachSchema(PracticeSchema);

Meteor.methods({
  insertPractice: function(doc) {
    check(doc, Practice.simpleSchema());
    Practice.insert(doc);
  },
  editPractice: function(doc, docId) {
    check(doc, Practice.simpleSchema());
    Practice.update({_id: docId}, doc);
  }
});