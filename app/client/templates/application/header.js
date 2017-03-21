Template.header.helpers({
  currentUserEmail() {
    const user = Meteor.user();
    if (user) {
      return user.emails[0].address;
    }
    return null;
  },
  dropdownId() {
    return !Meteor.user() ? 'dropdown-menu' : '';
  },
  pathForPublicmonitor() {
    return FlowRouter.path('publicmonitorRoute');
  },
  pathForAccount() {
    return FlowRouter.path('accountRoute');
  },
  pathForDeviceadmin() {
    return FlowRouter.path('deviceadminRoute');
  },
  pathForMeasurements() {
    return FlowRouter.path('measurementsRoute');
  }
});

Template.header.events({
  'click #logout-btn': function(event) {
    Meteor.logout(function(error) {
      if (error) {
        console.log(error);
      } else {
        console.log('Logged out');
      }
    });
  }
});