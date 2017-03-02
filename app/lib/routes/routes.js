FlowRouter.route('/', {
  name: 'publicmonitorRoute',
  action: function() {
    BlazeLayout.render('appLayout', {
      main: 'publicmonitor'
    });
  }
});

FlowRouter.route('/account', {
  name: 'accountRoute',
  action: function() {
    BlazeLayout.render('appLayout', {
      main: 'useradmin'
    });
  }
});

FlowRouter.route('/opqboxes', {
  name: 'deviceadminRoute',
  action: function() {
    BlazeLayout.render('appLayout', {
      main: 'deviceadmin'
    });
  }
});

FlowRouter.route('/opqboxes/:deviceId', {
  name: 'deviceconfigRoute',
  action: function() {
    BlazeLayout.render('appLayout', {
      main: 'deviceconfig'
    });
  }
});

FlowRouter.route('/signup', {
  name: 'signupRoute',
  action: function() {
    BlazeLayout.render('appLayout', {
      main: 'signup'
    });
  }
});

FlowRouter.route('/measurements', {
  name: 'measurementsRoute',
  action: function() {
    BlazeLayout.render('appLayout', {
      main: 'measurements'
    });
  }
});

