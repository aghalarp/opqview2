import { Meteor } from 'meteor/meteor';

/**
 * Experimental function utilizing a Promise object that will eventually return a jQuery object matching the requested
 * selector. Particularly useful in reactive contexts because we don't have to worry about the flush cycle and whether
 * or not the page element has rendered/re-rendered.
 * @param selector - The dom element to select
 * @param intervalMs - The number of milliseconds to wait between each selection attempt.
 * @param timeoutMs - The total number of milliseconds to wait before timing out.
 * @param templateInstance - The template instance from which to select an element.
 * @returns {Promise} - A Promise of a jQuery object matching the given selector.
 */
export const jQueryPromise = (selector, intervalMs, timeoutMs, templateInstance) => {
  return new Promise(function(resolve, reject) {
    timeoutMs = (timeoutMs > 60000) ? 60000 : timeoutMs; // 60 second max timeout.
    const totalRuns = timeoutMs / intervalMs;
    let currentRun = 0;
    let jQueryElement;
    let timer = Meteor.setInterval(() => {
      if (currentRun < totalRuns) {
        currentRun++; // Should be placed up top in case function has runtime error, otherwise infinite loop will occur.

        if (!templateInstance.view.isCreated) {
          reject('Template does not exist.');
          Meteor.clearInterval(timer);
        }
        if (templateInstance.view.isDestroyed) {
          reject('Template has been destroyed and no longer exists.');
          Meteor.clearInterval(timer);
        }

        // Still need to check if template has been destroyed because JS functions always run to completion unless error thrown.
        jQueryElement = (!templateInstance.view.isDestroyed) ? templateInstance.$(selector) : null;
        if (!!jQueryElement) {
          resolve(jQueryElement);
          Meteor.clearInterval(timer);
        }
      }
      else {
        reject(`Unable to select: ${selector}`);
        Meteor.clearInterval(timer);
      }
    }, intervalMs);
  });
};

