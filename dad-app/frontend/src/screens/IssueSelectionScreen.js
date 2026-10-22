import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import CategoryButton from '../components/CategoryButton';
import theme from '../constants/theme';
import { getCategoryById, getIssuesForCategory } from '../constants/homeCategories';

export default function IssueSelectionScreen({ navigation, route }) {
  const { categoryId, imageOrModelData, userSkillLevel } = route.params;

  const category = getCategoryById(categoryId);
  const issues = getIssuesForCategory(categoryId);

  function handleSelectIssue(issue) {
    navigation.navigate('Question', {
      problemType: issue.id,
      label: issue.label,
      categoryTitle: category.title,
      imageOrModelData,
      userSkillLevel,
    });
  }

  function handleCustomProblem() {
    const customProblemType = issues[0]?.id;
    navigation.navigate('CustomProblem', {
      problemType: customProblemType,
      previousAnswers: [],
      imageOrModelData,
      userSkillLevel,
      label: 'Something else?',
      categoryTitle: category.title,
      returnToQuestion: {
        problemType: customProblemType,
        label: 'Something else?',
        categoryTitle: category.title,
        resumeIndex: 0,
        resumeAnswers: [],
      },
    });
  }

  if (!category) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>That category could not be found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Text style={styles.icon}>{category.icon}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.contextLabel}>Your project</Text>
          <Text style={styles.title}>{category.title}</Text>
          <Text style={styles.subtitle}>{category.subtitle}</Text>
        </View>
      </View>

      <View style={styles.prompt}>
        <Text style={styles.promptTitle}>What’s happening?</Text>
        <Text style={styles.promptText}>Choose the closest match.</Text>
      </View>

      <View style={styles.issueList}>
        {issues.map((issue) => (
          <CategoryButton
            key={issue.id}
            icon={issue.icon}
            label={issue.label}
            onPress={() => handleSelectIssue(issue)}
          />
        ))}

        <CategoryButton
          icon="?"
          label="Something else?"
          onPress={handleCustomProblem}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.typography.body,
    color: theme.colors.danger,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  icon: {
    fontSize: 26,
  },
  headerCopy: {
    flex: 1,
  },
  contextLabel: {
    marginBottom: 2,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: theme.colors.subtext,
    lineHeight: 20,
  },
  prompt: {
    marginBottom: theme.spacing.md,
  },
  promptTitle: {
    fontSize: theme.typography.sectionHeading,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.25,
  },
  promptText: {
    marginTop: 3,
    fontSize: theme.typography.helper,
    color: theme.colors.subtext,
    lineHeight: 21,
  },
  issueList: {
    gap: theme.spacing.sm,
  },
});
