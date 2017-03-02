/**
 * The Users collection is a part of Meteor's Accounts package. There is a separate Person object for each User to
 * hold all the custom User information we require.
 * This file should only contain Meteor methods used for interacting with the Users collection.
 * Accounts API: http://docs.meteor.com/#/full/accounts_api
 * Methods defined here are related to the Users collection in some manner.
 */

Meteor.methods({
  changeEmail(newEmail) {
    // The addEmail and removeEmail functions are both server-only functions.
    if (Meteor.isServer) {
      if (!SimpleSchema.RegEx.Email.test(newEmail)) {
        throw new Meteor.Error("Not a valid E-mail address.");
      }

      if (newEmail === Meteor.user().emails[0].address) {
        throw new Meteor.Error("Identical e-mail address is already set.");
      }

      if (!Meteor.userId()) {
        throw new Meteor.Error("Not currently logged in.");
      }

      // Update email. The Accounts package supports multiple emails per user, but we only want one per user for now.
      // So we remove existing email and add new email.
      if (Meteor.userId() && newEmail != Meteor.user().emails[0].address) {
        Accounts.addEmail(Meteor.userId(), newEmail);
        Accounts.removeEmail(Meteor.userId(), Meteor.user().emails[0].address);
        console.log("E-mail address changed.");
        return true;
      } else {
        throw new Meteor.Error("E-mail could not be changed.");
      }
    }
  }
});
