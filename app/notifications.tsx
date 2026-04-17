import { View, Text, StyleSheet } from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

export default function NotificationsScreen() {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.placeholder}>Notifications</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.body,
  },
});
