import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

import '../../ui/layouts/appLayout/appLayoutPublic.js';

import '../../ui/pages/measurements/measurements.js';
// import '../../ui/pages/measurements/measurements.html';

// FlowRouter.route('/', {
//   name: 'publicmonitorRoute',
//   action: function() {
//     BlazeLayout.render('appLayoutPublic', {
//       main: 'publicmonitor'
//     });
//   }
// });
//
// FlowRouter.route('/account', {
//   name: 'accountRoute',
//   action: function() {
//     BlazeLayout.render('appLayoutAuth', {
//       main: 'useradmin'
//     });
//   }
// });
//
// FlowRouter.route('/opqboxes', {
//   name: 'deviceadminRoute',
//   action: function() {
//     BlazeLayout.render('appLayoutAuth', {
//       main: 'deviceadmin'
//     });
//   }
// });
//
// FlowRouter.route('/opqboxes/:deviceId', {
//   name: 'deviceconfigRoute',
//   action: function() {
//     BlazeLayout.render('appLayoutAuth', {
//       main: 'deviceconfig'
//     });
//   }
// });
//
// FlowRouter.route('/signup', {
//   name: 'signupRoute',
//   action: function() {
//     BlazeLayout.render('appLayoutPublic', {
//       main: 'signup'
//     });
//   }
// });
//
// FlowRouter.route('/measurements', {
//   name: 'measurementsRoute',
//   action: function() {
//     BlazeLayout.render('appLayoutAuth', {
//       main: 'measurements'
//     });
//   }
// });

FlowRouter.route('/live', {
  name: 'liveRoute',
  action: function() {
    BlazeLayout.render('appLayoutPublic', {
      main: 'measurements'
    });
  }
});

