/**
 * Experimental function utilizing a Promise object that will eventually return a jQuery object matching the requested
 * selector. Particularly useful in reactive contexts because we don't have to worry about the flush cycle and whether
 * or not the page element has rendered/re-rendered.
 * @param selector - The dom element to select
 * @param intervalMs - The number of milliseconds to wait between each selection attempt.
 * @param timeoutMs - The total number of milliseconds to wait before timing out.
 * @returns {Promise} - A Promise of a jQuery object matching the given selector.
 */
function jQueryPromise(selector, intervalMs, timeoutMs) {
  return new Promise(function(resolve, reject) {
    const totalRuns = timeoutMs / intervalMs;
    let currentRun = 0;
    let jQueryElement;
    let timer = Meteor.setInterval(() => {
      if (currentRun < totalRuns) {
        jQueryElement = $(selector);
        if (!!jQueryElement) {
          resolve(jQueryElement);
          Meteor.clearInterval(timer);
        }
        currentRun++;
      }
      else {
        reject(`Unable to select: ${selector}`);
        Meteor.clearInterval(timer);
      }
    }, intervalMs);
  });
}

