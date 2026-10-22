import React, { Suspense, lazy, useCallback } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import theme from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import IntroScreen from '../screens/IntroScreen';
import IssueSelectionScreen from '../screens/IssueSelectionScreen';
import QuestionScreen from '../screens/QuestionScreen';

const ConnectProScreen = lazy(() => import('../screens/ConnectProScreen'));
const CustomProblemScreen = lazy(() => import('../screens/CustomProblemScreen'));
const DiagnosisSafetyScreen = lazy(() => import('../screens/DiagnosisSafetyScreen'));
const DiagnosisScreen = lazy(() => import('../screens/DiagnosisScreen'));
const GuidedStepsScreen = lazy(() => import('../screens/GuidedStepsScreen'));
const MoreScreen = lazy(() => import('../screens/MoreScreen'));
const RepairCompleteScreen = lazy(() => import('../screens/RepairCompleteScreen'));
const RepairHistoryScreen = lazy(() => import('../screens/RepairHistoryScreen'));
const RepairsTodoScreen = lazy(() => import('../screens/RepairsTodoScreen'));
const ShoppingListScreen = lazy(() => import('../screens/ShoppingListScreen'));
const ToolInventoryScreen = lazy(() => import('../screens/ToolInventoryScreen'));
const ToolsForRepairScreen = lazy(() => import('../screens/ToolsForRepairScreen'));

const Stack = createNativeStackNavigator();
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.primary,
  },
};

const ROUTE_HEADERS = {
  Home: {
    title: 'Diagnose & Do',
    subtitle: 'What do you need help with?',
  },
  IssueSelection: {
    title: 'Choose Issue',
    subtitle: 'Pick the closest match',
  },
  Question: {
    title: 'Diagnose',
    subtitle: 'Answer a few quick questions',
  },
  CustomProblem: {
    title: 'Custom Issue',
    subtitle: 'Describe what is going on',
  },
  DiagnosisSafety: {
    title: 'Safety First',
    subtitle: 'Check the risk before you start',
  },
  Diagnosis: {
    title: 'Diagnosis',
    subtitle: 'Review the likely cause',
  },
  GuidedSteps: {
    title: 'Fix It',
    subtitle: 'Work through the repair',
  },
  More: {
    title: 'More',
    subtitle: 'Account and utilities',
  },
  ConnectPro: {
    title: 'Connect to a Pro',
    subtitle: 'Know when to hand it off',
  },
  RepairComplete: {
    title: 'Repair Complete',
    subtitle: 'Save the finished job',
  },
  ToolInventory: {
    title: 'Toolbox',
    subtitle: 'Manage your tools and supplies',
  },
  ToolsForRepair: {
    title: 'Before You Begin',
    subtitle: 'Get everything ready for the repair.',
  },
  ShoppingList: {
    title: 'Shopping List',
    subtitle: 'Keep track of what you still need',
  },
  RepairHistory: {
    title: 'Repair History',
    subtitle: 'Review completed jobs',
  },
  RepairsTodo: {
    title: 'Repairs',
    subtitle: 'Continue where you left off',
  },
};

const PRIMARY_NAV_ITEMS = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home-variant',
    route: 'Home',
    routes: ['Home', 'CustomProblem', 'IssueSelection', 'Question', 'DiagnosisSafety', 'Diagnosis', 'GuidedSteps', 'ConnectPro', 'RepairComplete'],
  },
  {
    key: 'repairs',
    label: 'Repairs',
    icon: 'clipboard-text-clock-outline',
    route: 'RepairsTodo',
    routes: ['RepairsTodo', 'RepairHistory', 'ToolsForRepair'],
  },
  {
    key: 'more',
    label: 'More',
    icon: 'dots-horizontal-circle-outline',
    route: 'More',
    routes: ['More', 'ToolInventory'],
  },
];

function getActiveNavKey(routeName) {
  return PRIMARY_NAV_ITEMS.find((item) => item.routes.includes(routeName))?.key;
}

function withTopNavigation(ScreenComponent) {
  return function ScreenWithTopNavigation(screenProps) {
    const insets = useSafeAreaInsets();
    const routeName = screenProps.route?.name;
    const routeParams = screenProps.route?.params;
    const header = ROUTE_HEADERS[routeName] ?? { title: '', subtitle: '' };
    const canGoBack = screenProps.navigation.canGoBack();
    const isPrimaryRoute = ['Home', 'RepairsTodo', 'More'].includes(routeName);
    const showBackButton = canGoBack && !isPrimaryRoute;

    const handleBackPress = useCallback(() => {
      if (routeName === 'Question' && typeof routeParams?.questionIndex === 'number') {
        if (routeParams.questionIndex > 0) {
          const previousIndex = routeParams.questionIndex - 1;
          const previousAnswers = Array.isArray(routeParams.questionAnswers)
            ? routeParams.questionAnswers.slice(0, previousIndex)
            : [];

          screenProps.navigation.navigate({
            name: 'Question',
            params: {
              resumeIndex: previousIndex,
              resumeAnswers: previousAnswers,
            },
            merge: true,
          });
          return;
        }
      }

      screenProps.navigation.goBack();
    }, [routeName, routeParams, screenProps.navigation]);

    const showHomeHeader = !['Home', 'RepairsTodo', 'More'].includes(routeName);
    const bottomNavigationOffset = Math.max(insets.bottom, theme.spacing.md);
    const repairContentBottomInset =
      bottomNavigationOffset + theme.layout.bottomNavigationHeight + theme.spacing.sm;

    return (
      <View style={styles.screenShell}>
        {showHomeHeader ? (
          <SafeAreaView style={styles.headerSafeArea}>
            <View style={styles.headerRow}>
              {showBackButton ? (
                <Pressable
                  onPress={handleBackPress}
                  style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressDim]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.white} />
                </Pressable>
              ) : null}

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {header.title}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {header.subtitle}
                </Text>
              </View>

            </View>
          </SafeAreaView>
        ) : null}

        <View
          style={[
            styles.contentArea,
            showHomeHeader && { marginBottom: repairContentBottomInset },
          ]}
        >
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScreenComponent {...screenProps} />
          </Suspense>
        </View>
        <PrimaryBottomNav navigation={screenProps.navigation} routeName={routeName} />
      </View>
    );
  };
}

function PrimaryBottomNav({ navigation, routeName }) {
  const insets = useSafeAreaInsets();
  const activeKey = getActiveNavKey(routeName);

  return (
    <View
      style={[
        styles.bottomNavSafeArea,
        { bottom: Math.max(insets.bottom, theme.spacing.md) },
      ]}
    >
      {PRIMARY_NAV_ITEMS.map((item) => {
        const active = activeKey === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => navigation.navigate(item.route)}
            style={({ pressed }) => [styles.bottomNavItem, active && styles.bottomNavItemActive, pressed && styles.navPillPressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={active ? 23 : 21}
              color={active ? theme.colors.primary : theme.colors.subtext}
            />
            <Text style={[styles.bottomNavText, active && styles.bottomNavTextActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScreenLoadingFallback() {
  return (
    <View style={styles.lazyFallback}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonBadge} />
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLineShort} />
      </View>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={styles.lazyFallbackText}>Loading...</Text>
    </View>
  );
}

const HomeWithTopNavigation = withTopNavigation(HomeScreen);
const IssueSelectionWithTopNavigation = withTopNavigation(IssueSelectionScreen);
const QuestionWithTopNavigation = withTopNavigation(QuestionScreen);
const CustomProblemWithTopNavigation = withTopNavigation(CustomProblemScreen);
const DiagnosisSafetyWithTopNavigation = withTopNavigation(DiagnosisSafetyScreen);
const DiagnosisWithTopNavigation = withTopNavigation(DiagnosisScreen);
const GuidedStepsWithTopNavigation = withTopNavigation(GuidedStepsScreen);
const MoreWithTopNavigation = withTopNavigation(MoreScreen);
const ConnectProWithTopNavigation = withTopNavigation(ConnectProScreen);
const RepairCompleteWithTopNavigation = withTopNavigation(RepairCompleteScreen);
const ToolInventoryWithTopNavigation = withTopNavigation(ToolInventoryScreen);
const ToolsForRepairWithTopNavigation = withTopNavigation(ToolsForRepairScreen);
const ShoppingListWithTopNavigation = withTopNavigation(ShoppingListScreen);
const RepairHistoryWithTopNavigation = withTopNavigation(RepairHistoryScreen);
const RepairsTodoWithTopNavigation = withTopNavigation(RepairsTodoScreen);

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Intro"
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Home" component={HomeWithTopNavigation} />
        <Stack.Screen name="IssueSelection" component={IssueSelectionWithTopNavigation} />
        <Stack.Screen name="Question" component={QuestionWithTopNavigation} />
        <Stack.Screen name="CustomProblem" component={CustomProblemWithTopNavigation} />
        <Stack.Screen name="DiagnosisSafety" component={DiagnosisSafetyWithTopNavigation} />
        <Stack.Screen name="Diagnosis" component={DiagnosisWithTopNavigation} />
        <Stack.Screen name="GuidedSteps" component={GuidedStepsWithTopNavigation} />
        <Stack.Screen name="More" component={MoreWithTopNavigation} />
        <Stack.Screen name="ConnectPro" component={ConnectProWithTopNavigation} />
        <Stack.Screen name="RepairComplete" component={RepairCompleteWithTopNavigation} />
        <Stack.Screen name="ToolInventory" component={ToolInventoryWithTopNavigation} />
        <Stack.Screen name="ToolsForRepair" component={ToolsForRepairWithTopNavigation} />
        <Stack.Screen name="ShoppingList" component={ShoppingListWithTopNavigation} />
        <Stack.Screen name="RepairHistory" component={RepairHistoryWithTopNavigation} />
        <Stack.Screen name="RepairsTodo" component={RepairsTodoWithTopNavigation} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screenShell: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  headerSafeArea: {
    backgroundColor: theme.colors.primary,
    ...theme.shadow.soft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingHorizontal: 18,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.screenTitle,
    fontWeight: '800',
    color: theme.colors.white,
    lineHeight: 28,
    letterSpacing: 0,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: theme.typography.screenSubtitle,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.76)',
    lineHeight: 19,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bottomNavSafeArea: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    minHeight: theme.layout.bottomNavigationHeight,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.10)',
    backgroundColor: 'rgba(255,254,251,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    paddingVertical: 7,
    ...theme.shadow.nav,
  },
  bottomNavItem: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bottomNavItemActive: {
    backgroundColor: '#EAF3E8',
  },
  navPillPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  bottomNavText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.subtext,
  },
  bottomNavTextActive: {
    color: theme.colors.primary,
  },
  pressDim: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  lazyFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  skeletonCard: {
    width: 220,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.10)',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.soft,
  },
  skeletonBadge: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: '#EAF2E7',
    marginBottom: theme.spacing.md,
  },
  skeletonLineWide: {
    width: '78%',
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: '#E5ECE2',
    marginBottom: theme.spacing.sm,
  },
  skeletonLineShort: {
    width: '48%',
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: '#EDF2EA',
  },
  lazyFallbackText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
  },
});
