// File to register global template helpers.

/**
 * Registers the Schemas object found in lib/collections/schemas.js
 * Allows us to easily call our schemas in all templates.
 */
Template.registerHelper("Schemas", Schemas);

Template.registerHelper('formatDate', function(date) {
  return moment(date).format('HH:mm:ss [[]DD MMM YYYY[]]');
});
