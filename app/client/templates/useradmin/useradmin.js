Template.useradmin.onCreated(function() {
  const template = Template.instance();

  template.subscribe('personsCollection');
});

Template.useradmin.helpers({
  userSettingsSchema() {
    return Global.Schemas.UserSettings
  },
  userSettingsDoc() {
    const personDoc = Persons.findOne({userId: Meteor.userId()});
    const userDoc = Meteor.users.findOne({_id: Meteor.userId()});

    // Create object holding info from userDoc.
    const userSchemaExtension = {
      email: userDoc.emails[0].address,
      //password: "",
      //confirmPassword: ""
    };

    // Merge into single doc containing all data we need for the form.
    const userSettingsFormDoc = _.extend({}, personDoc, userSchemaExtension);

    return userSettingsFormDoc;
  }
});

AutoForm.hooks({
  userSettingsForm: {
    onSubmit: function (insertDoc, updateDoc, currentDoc) {
      const self = this; // Need self in order to do this.done() in callbacks below.

      // Update password if fields are present.
      if (insertDoc.oldPassword && insertDoc.newPassword && insertDoc.confirmNewPassword) {
        Accounts.changePassword(insertDoc.oldPassword, insertDoc.newPassword, function(error) {
          if (error) {
            self.addStickyValidationError("oldPassword", "incorrectPassword"); // Display error on form.
            self.done(error); // Notify AutoForm of the error. Goes to onError hook if exists.
          } else {
            // Success
            console.log("Password successfully changed.");
            //self.done();
          }
        });
      }

      // Update email if changed.
      if (insertDoc.email && insertDoc.email != Meteor.user().emails[0].address) {
        Meteor.call("changeEmail", insertDoc.email, function(error, result) {
          if (error) {
            self.done(error);
          } else {
            console.log("E-mail successfully changed.");
            //self.done();
          }
        });
      }

      // Create MongoDB modifier object for Person collection. Remove fields related to Accounts package.
      const personModifier = {
        id: currentDoc._id,
        $set: _.omit(updateDoc.$set, ["email","oldPassword", "newPassword", "confirmNewPassword"]),
        $unset: _.omit(updateDoc.$unset, ["email","oldPassword", "newPassword", "confirmNewPassword"])
      };

      Meteor.call("updatePerson", personModifier, function(error, result) {
        if (error) {
          self.done(error);
        } else {
          console.log("User successfully updated.");
          self.done();
        }
      });

      return false; // Equivalent to event.preventDefault(). Stops actual form submission.
    },
    beginSubmit: function() {
      // Must remove all manual sticky validations here. Otherwise, form will never be able to submit because it
      // cannot ever pass the pre-submit validations.
      this.removeStickyValidationError("oldPassword");
    }
  }
});