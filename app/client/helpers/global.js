// Global template helpers

Template.registerHelper('getTemplateInstance', function() {
  return Template.instance();
});

Template.registerHelper('getTemplateInstanceVariable', function(varName) {
  const templateVar = Template.instance()[varName];
  return templateVar; // Returns the variable reference or undefined if does not exist.
});

Template.registerHelper('formatDate', function(date) {
  return moment(date).format('HH:mm:ss [[]DD MMM YYYY[]]');
});

Template.registerHelper('formatDecimals', function(number) {
  return (typeof number === 'number') ? number.toFixed(3) : null;
});

Template.registerHelper('showFlashAlert', function(templateInstance) {
  const message = templateInstance.flashAlert.get();
  if (message) {
    return message;
  }
  return (message) ? message : null;
});

export const setFlashAlert = (message, templateInstance) => {
  check(message, String);
  templateInstance.flashAlert = new ReactiveVar(message);
};