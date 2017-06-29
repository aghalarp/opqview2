import { Template } from 'meteor/templating';
import { Accounts } from 'meteor/accounts-base'
import { FlowRouter } from 'meteor/kadira:flow-router';
import './signup.html';

Template.signup.helpers({

});

Template.signup.events({
  'submit .signup-form': function(event) {
    event.preventDefault();

    const firstName = event.target.firstName.value;
    const lastName = event.target.lastName.value;
    const email = event.target.email.value;
    const password = event.target.password.value;
    console.log(firstName, lastName, email, password);

    // Create User, then Person in callback.
    Accounts.createUser({email: email, password: password}, function(error) {
      if (error) {
        console.log(error);
      } else {
        // User created successfully and is automatically logged in.
        const currUserId = Meteor.userId();

        // Create Person obj with userId reference, then call createPerson method.
        const person = {
          userId: currUserId,
          firstName: firstName,
          lastName: lastName
        };

        Meteor.call("createPerson", person, function(error, result) {
          if (error) {
            console.log(error);
          } else {
            console.log("Inserted Person successfully: " + result);
            FlowRouter.go("/"); // Redirect to home page.
          }
        });

      }
    });
  }
});
