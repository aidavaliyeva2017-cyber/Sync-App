import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';

// Routing is handled by the guard in _layout.tsx.
// This screen just shows a spinner while auth state loads.
export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background.base, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.teal.main} />
    </View>
  );
}
