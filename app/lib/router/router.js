Router.configure({
  layoutTemplate: 'layout',
  loadingTemplate: 'loading'
});

Router.route('/', {
  name: 'publicmonitor',
  waitOn: function() {
    return Meteor.subscribe('eventsCollection');
  }
});

Router.route('/practice', {
  name: 'practice',
  waitOn: function() {
    return Meteor.subscribe('practiceCollection');
  }
});

Router.route('/practice/:_id', {
  name: 'editPractice',
  template: 'practice',
  data: function() { return Practice.findOne(this.params._id); },
  waitOn: function() {
    return Meteor.subscribe('practiceCollection');
  }
});