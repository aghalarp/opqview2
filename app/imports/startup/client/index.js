import './routes';
//import '../../ui/layouts/appLayout/appLayoutAuth.js';
// import '../../ui/layouts/appLayout/appLayoutPublic.js';
import '../../ui/utils/globalTemplateHelpers.js';
import '../../ui/stylesheets/site.css';

// Get rid of the default __blaze-root div element and use the regular <body> element instead.
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
BlazeLayout.setRoot('body');