Template.flashAlert.onCreated(function() {
  const template = this;
  template.flashAlert = template.data.flashAlertRef; // ReactiveVar from parent template. {message, type, expireAt}.
  template.isActive = new ReactiveVar(false);

  // Autorun responsible for displaying and hiding alerts when they expire.
  template.autorun(function() {
    const alert = template.flashAlert.get();

    if (alert) {
      const expireFromNowMs = alert.expireAt - Date.now();
      if (expireFromNowMs > 0) {
        template.isActive.set(true); // Un-hides template contents.

        Meteor.setTimeout(function() {
          template.isActive.set(false); // Hide template contents after timeout.
        }, expireFromNowMs);
      }
    }
  })
});

Template.flashAlert.helpers({
  alertType() {
    const template = Template.instance();
    const alertType = template.flashAlert.get().type;
    switch (alertType) {
      case 'success':
        return 'success';
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'danger';
      default:
        return 'info';
    }
  },
  isActiveAlert() {
    const template = Template.instance();
    return template.isActive.get();
  },
  getMessage() {
    const template = Template.instance();
    const isActive = template.isActive.get();
    const message = template.flashAlert.get().message;
    return (isActive && message) ? message : null;
  }
});