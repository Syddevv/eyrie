import { Alert } from 'react-native';

export function showIncompleteFormAlert(
  title = 'Complete required fields',
  message = 'Please complete the required data before continuing.'
) {
  Alert.alert(title, message);
}
