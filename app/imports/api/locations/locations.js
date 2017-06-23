Locations = new Mongo.Collection("locations", {idGeneration: "MONGO"});

// Create and attach schema for this collection
LocationsSchema = new SimpleSchema({
  gridId: { // Note: Not a collection-related ID field.
    type: String
  },
  gridScale: {
    type: Number,
    decimal: true
  },
  gridRow: {
    type: Number,
    //decimal: true
  },
  gridCol: {
    type: Number,
    //decimal: true
  },
  northEastLatitude: {
    type: Number,
    decimal: true
  },
  northEastLongitude: {
    type: Number,
    decimal: true
  },
  southWestLatitude: {
    type: Number,
    decimal: true
  },
  southWestLongitude: {
    type: Number,
    decimal: true
  }
});

Locations.attachSchema(LocationsSchema);

Meteor.methods({

});


export const getLocationOrCreateNew = (id, fields) => {

};
