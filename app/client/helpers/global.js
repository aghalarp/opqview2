// Global template helpers
import {createFlashAlertMsgObject} from '../templates/application/alerts/flashAlert.js';


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

Template.registerHelper('consoleLog', function(obj) {
  console.log(obj);
});

Template.registerHelper('flashAlertMsgObj', createFlashAlertMsgObject);

/**
 * Call this helper whenever we create a template inclusion that does not require any data context.
 *
 * Reasoning: Template inclusions that do not have any arguments will automatically inherit the data context of the
 * template where it was called from. Often, the inherited data is not needed at all by the sub-template, in which
 * case it is pointless to include it, as it just adds another layer of confusion.
 */
Template.registerHelper('withEmptyDataContext', () => {
  return {};
});