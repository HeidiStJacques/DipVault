import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  title: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
};

export default function Header({
  title,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
}: Props) {
  return (
    <View style={styles.header}>
      
      <TouchableOpacity onPress={onLeftPress}>
        <Text style={styles.icon}>{leftIcon}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity onPress={onRightPress}>
        <Text style={styles.icon}>{rightIcon}</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#D4AF37',
    letterSpacing: 1,
  },
  icon: {
    fontSize: 22,
    color: '#D4AF37',
  },
});