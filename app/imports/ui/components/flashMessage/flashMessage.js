import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import './flashMessage.html';

Template.flashMessage.onCreated(function flashMessageOnCreated() {
  const template = this;

  // Validate data context.
  template.autorun(() => {
    new SimpleSchema({
      flashMessageReactiveVar: {type: ReactiveVar}
    }).validate(Template.currentData());

    // Must separately validate the ReactiveVar fields.
    const flashMessage = Template.currentData().flashMessageReactiveVar.get();
    if (flashMessage) { // Only want to validate if the RV holds an actual value.
      new SimpleSchema({
        type: {type: String},
        expireAtMillisFromEpoch: {type: Number},
        message: {type: String},
        messageHeader: {type: String, optional: true},
        messageIcon: {type: String, optional: true}
      }).validate(flashMessage);
    }
  });

  template.flashMessage = template.data.flashMessageReactiveVar;
  template.isActive = new ReactiveVar(false);

  // Autorun responsible for showing and hiding message when it expires.
  template.autorun(function() {
    const flashMessage = template.flashMessage.get();

    if (flashMessage) {
      const expireFromNowMs = flashMessage.expireAtMillisFromEpoch - Date.now();
      if (expireFromNowMs > 0) {
        template.isActive.set(true); // Un-hides template contents.

        Meteor.setTimeout(function() {
          template.isActive.set(false); // Hide template contents after timeout.
        }, expireFromNowMs);
      }
    }
  })
});

Template.flashMessage.onRendered(function flashMessageOnRendered() {
  const template = this;

  // Allows message block to be dismissable.
  template.$('.message .close')
    .on('click', function() {
      $(this)
        .closest('.message')
        .transition('fade')
      ;
    });
});

Template.flashMessage.helpers({
  messageType() {
    const template = Template.instance();

    const messageType = template.flashMessage.get().type;
    switch (messageType) {
      case 'positive': // Green
        return 'positive';
      case 'negative': // Red
        return 'negative';
      case 'warning': // Yellow
        return 'warning';
      case 'info': // Blue
        return 'info';
      default:
        return 'info';
    }
  },
  visibility() {
    const template = Template.instance();
    const isActive = template.isActive.get();

    return (isActive) ? 'visible' : 'hidden';
  },
  message() {
    const template = Template.instance();
    const message = template.flashMessage.get().message;
    return (message) ? message : '';
  },
  messageHeader() {
    const template = Template.instance();
    const messageHeader = template.flashMessage.get().messageHeader;
    return (messageHeader) ? messageHeader : '';
  },
  hasIcon() {
    const template = Template.instance();
    const messageIcon = template.flashMessage.get().messageIcon;
    return (messageIcon) ? true : false;
  },
  iconName() {
    const template = Template.instance();
    const messageIcon = template.flashMessage.get().messageIcon;
    return (messageIcon) ? messageIcon : '';
  }
});

export const createFlashMessageMsgObject = (type, durationSeconds, message, messageHeader = '', messageIcon = '') => {
  check(type, String);
  check(durationSeconds, Number);
  check(message, String);
  check(messageHeader, String);
  check(messageIcon, String);

  if (durationSeconds > 60) durationSeconds = 60; // Set max time limit of 1 minute.
  const expireAtMillisFromEpoch = Date.now() + (durationSeconds * 1000); // Milliseconds

  return {type, expireAtMillisFromEpoch, message, messageHeader, messageIcon};
};


export const setFlashAlert = (flashAlertMsgObj, flashAlertRV) => {
  check(flashAlertRV, {
    message: String,
    type: String,
    expireAtMillis: Number
  });
  check(flashAlertRV, ReactiveVar);

  flashAlertRV.set(flashAlertObj);

  return flashAlertObj;
};

export const flashMessageConstructor = (templateInstance) => {
  templateInstance.flashMessage = new ReactiveVar(createFlashMessageMsgObject('negative', 20, 'testing 123', 'Hi!!', 'feed'));
};