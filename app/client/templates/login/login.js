Template.login.onCreated(function() {
  const template = this;

  template.flashAlert = (template.data.withFlashAlert) ? new ReactiveVar(template.data.withFlashAlert) : new ReactiveVar();
});

Template.login.helpers({
  loginSchema() {
    return Global.Schemas.Login;
  },
  pathForSignup() {
    return FlowRouter.path('signupRoute');
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