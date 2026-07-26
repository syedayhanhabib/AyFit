import { NativeTabs } from 'expo-router/unstable-native-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useColorScheme } from 'react-native';

import { Colors, Palette } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme ?? 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelVisibilityMode="labeled"
      labelStyle={{
        default: { color: Palette.textSecondary },
        selected: { color: Palette.brand, fontWeight: '600' },
      }}
      // Labels were tinting on selection but icons weren't: `labelStyle` is the
      // only prop that reads a nested `{default, selected}` for *text*, and the
      // icon color has its own, separate prop that was never set — so icons fell
      // through to Android's `onSurfaceVariant` default in both states.
      // `iconColor` takes the same `{default, selected}` shape (NativeTabsProps
      // in expo-router/build/native-tabs/types.d.ts), and gets split into
      // `iconColor`/`selectedIconColor` internally.
      iconColor={{
        default: Palette.textSecondary,
        selected: Palette.brand,
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Track</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={<NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="dumbbell" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="summary">
        <NativeTabs.Trigger.Label>Summary</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="chart-timeline-variant" />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={<NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="calendar-month" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="account-circle-outline" />
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
