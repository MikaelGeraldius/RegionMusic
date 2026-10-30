import { registerRootComponent } from 'expo';

// Defines the background location task before anything else runs.
import './src/background/locationTask';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
