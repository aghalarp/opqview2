Template.header.helpers({
  loginSchema() {
    return Global.Schemas.Login;
  },
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
  pathForSignup() {
    return FlowRouter.path('signupRoute');
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

AutoForm.hooks({
  loginForm: {
    onSubmit: function(insertDoc, updateDoc, currentDoc) {
      const self = this; // Need self in order to do this.done() in callbacks below.
      const username = insertDoc.email;
      const password = insertDoc.password;

      Meteor.loginWithPassword(username, password, function(error) {
        if (error) {
          switch (error.reason) {
            case 'User not found':
              self.addStickyValidationError('email', 'userNotFound');
              break;
            case 'Incorrect password':
              self.addStickyValidationError('password', 'incorrectPassword');
              break;
          }
          self.done(new Error(error.message));
        } else {
          console.log('Login successful!: ', username);
          self.done();
        }
      });

      return false; // Equivalent to event.preventDefault(). Stops actual form submission.
    },
    beginSubmit: function() {
      // Must remove all manual sticky validations here. Otherwise, form will never be able to submit because it
      // cannot ever pass the pre-submit validations.
      this.removeStickyValidationError('email');
      this.removeStickyValidationError('password');
    }
  }
});