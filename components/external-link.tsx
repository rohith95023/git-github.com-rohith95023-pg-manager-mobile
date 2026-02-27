import { Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  url: string;
  label?: string;
};

const ExternalLink = ({ url, label }: Props) => {
  const handlePress = async () => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <Pressable style={styles.button} onPress={handlePress} android_ripple={{ color: '#E0E7FF' }}>
      <Ionicons name={Platform.OS === 'ios' ? 'open-outline' : 'open-sharp'} size={18} color="#0F172A" />
      {label ? <></> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ExternalLink;
