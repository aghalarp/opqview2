Template.signup.helpers({
  signupSchema() {
    return Global.Schemas.Signup;
  },
  signupFormFieldOrder() {
    return ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'alertEmail', 'smsCarrier', 'smsNumber'];
  }
});

AutoForm.hooks({
  signupForm: {
    onSubmit: function(insertDoc, updateDoc, currentDoc) {
      // insertDoc is already validated at this point. Now we do two things:
      // 1. Create User
      // 2. Create Person with resulting User ID.

      const self = this; // Need self in order to do this.done() in callbacks below.

      // Create User. This function is asynchronous, so we must create Person inside the callback.
      // Password confirmation was already validated, so no need to check here.
      Accounts.createUser({email: insertDoc.email, password: insertDoc.password}, function(error) {
        if (error) {
          console.log(error.message);
          self.done(new Error(error.message)); // Notify AutoForm of the error.
        } else {
          // User created successfully and is automatically logged in.
          const currUserId = Meteor.userId();

          // Create Person obj with userId, send to insertPerson method.
          const person = {
            userId: currUserId,
            firstName: insertDoc.firstName,
            lastName: insertDoc.lastName,
            alertEmail: insertDoc.alertEmail,
            smsCarrier: insertDoc.smsCarrier,
            smsNumber: insertDoc.smsNumber
          };

          Meteor.call("insertPerson", person, function(error, result) {
            if (error) {
              console.log(error.message);
              self.done(new Error(error.message)); // Notify AutoForm of the error.
            } else {
              console.log("Insert Person Success: " + result);
              self.done(); // Notify AutoForm of success.
              FlowRouter.go("/"); // Redirect to publicmonitor
            }
          });

        }
      });

      return false; // Equivalent to event.preventDefault(). Stops actual form submission.
    }
  }
});