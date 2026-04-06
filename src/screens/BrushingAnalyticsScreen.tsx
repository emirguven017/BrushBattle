import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { type Colors, ui } from '../utils/colors';
import { createIosStyles, isIosUi } from '../utils/iosUi';
import { useColors } from '../context/ThemeContext';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';
import { dateKey, todayKey } from '../utils/date';
import {
  computeBrushingInsights,
  mergeSessionsById,
  type LateBrushSuggestion,
  type TypicalBrushLine,
} from '../utils/brushingInsights';
import type { SessionType } from '../types';

type DayRow = {
  dateKey: string;
  label: string;
  completed: number;
  planned: number;
  percent: number;
  points: number;
  hadMorning: boolean;
  hadMidday: boolean;
  hadEvening: boolean;
  isToday: boolean;
};

const SESSION_ICON: Record<SessionType, keyof typeof Ionicons.glyphMap> = {
  morning: 'sunny',
  midday: 'cloudy',
  evening: 'moon',
};

const SESSION_ACCENT: Record<SessionType, string> = {
  morning: '#F5A623',
  midday: '#3498DB',
  evening: '#9B59B6',
};

export const BrushingAnalyticsScreen: React.FC = () => {
  const colors = useColors();
  const ios = useMemo(() => createIosStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<DayRow[]>([]);
  const [avgPercent, setAvgPercent] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<{
    typical: TypicalBrushLine[];
    late: LateBrushSuggestion[];
  }>({ typical: [], late: [] });

  const plannedTypesList = user ? BrushingService.getPlannedSessionTypesForUser(user) : [];

  const sessionLabel = (type: SessionType): string => {
    if (type === 'morning') return t('morningTask');
    if (type === 'midday') return t('middayTask');
    return t('eveningTask');
  };

  const formatClock = (hhmm: string): string => {
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isNaN(h)) return hhmm;
    const d = new Date(2000, 0, 1, h, m ?? 0, 0);
    return d.toLocaleTimeString(language === 'en' ? 'en-US' : 'tr-TR', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      setInsights({ typical: [], late: [] });
      setLoading(false);
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    const prevY = mo === 1 ? y - 1 : y;
    const prevM = mo === 1 ? 12 : mo - 1;
    const [curMonth, prevMonthSessions] = await Promise.all([
      BrushingService.getSessionsForMonth(user.id, y, mo),
      BrushingService.getSessionsForMonth(user.id, prevY, prevM),
    ]);
    const monthSessions = mergeSessionsById(curMonth, prevMonthSessions);
    const plannedTypes = BrushingService.getPlannedSessionTypesForUser(user);
    const pCount = Math.max(1, plannedTypes.length);

    const nextRows: DayRow[] = [];
    let sumPct = 0;
    let totalDone = 0;

    for (let i = 0; i <= 6; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const daySessions = monthSessions.filter((s) => s.date === key);
      const completed = daySessions.filter((s) => s.status === 'completed').length;
      const pct = Math.min(100, Math.round((completed / pCount) * 100));
      sumPct += pct;
      totalDone += completed;

      const pts =
        daySessions.reduce((sum, s) => sum + (s.pointsEarned ?? 0), 0) +
        (daySessions.some((s) => s.dayBonusApplied) ? 10 : 0);

      const done = (type: SessionType) =>
        daySessions.some((s) => s.sessionType === type && s.status === 'completed');

      const label = d.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      nextRows.push({
        dateKey: key,
        label,
        completed,
        planned: pCount,
        percent: pct,
        points: pts,
        hadMorning: done('morning'),
        hadMidday: done('midday'),
        hadEvening: done('evening'),
        isToday: key === todayKey(),
      });
    }

    const fourteenDaysAgo = Date.now() - 14 * 86400000;
    setInsights(computeBrushingInsights(monthSessions, user, plannedTypes, fourteenDaysAgo));

    setRows(nextRows);
    setAvgPercent(Math.round(sumPct / 7));
    setTotalCompleted(totalDone);
    setLoading(false);
  }, [user, language]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().catch(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  if (!user) {
    return (
      <BrandedScreenBackground>
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>{t('somethingWrong')}</Text>
      </View>
      </BrandedScreenBackground>
    );
  }

  if (loading) {
    return (
      <BrandedScreenBackground>
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
      </BrandedScreenBackground>
    );
  }

  return (
    <BrandedScreenBackground>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        isIosUi && { paddingHorizontal: 16 },
        { paddingTop: insets.top + ui.screenPadding },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.white]}
          tintColor={colors.white}
        />
      }
    >
      <Text style={styles.screenTitle}>{t('brushingAnalyticsTitle')}</Text>

      <View style={[styles.summaryRow, styles.premiumCard, styles.summaryCardShell, isIosUi && ios.iosGroupedCard]}>
        <View style={styles.summaryAccent} />
        <View style={styles.summaryRowInner}>
          <View style={styles.summaryCell}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="analytics" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.summaryValue}>{avgPercent}%</Text>
            <Text style={styles.summaryLabel}>{t('brushingAnalyticsAvgCompletion')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="checkmark-done" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.summaryValue}>{totalCompleted}</Text>
            <Text style={styles.summaryLabel}>{t('brushingAnalyticsTotalSessions')}</Text>
          </View>
        </View>
      </View>

      {insights.typical.length > 0 || insights.late.length > 0 ? (
        <View style={styles.insightsWrap}>
          {insights.typical.length > 0 ? (
            <View style={[styles.insightCard, styles.premiumCard, isIosUi && ios.iosGroupedCard]}>
              <View style={styles.insightCardHead}>
                <View style={styles.insightIconCircle}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                </View>
                <View style={styles.insightHeadText}>
                  <Text style={styles.insightCardTitle}>{t('brushingInsightRhythmTitle')}</Text>
                  <Text style={styles.insightCardSub}>{t('brushingInsightRhythmSubtitle')}</Text>
                </View>
              </View>
              <Text style={styles.insightIntro}>{t('brushingInsightTypicalIntro')}</Text>
              {insights.typical.map((line, idx) => (
                <View key={line.type} style={[styles.typicalRow, idx > 0 && styles.typicalRowSep]}>
                  <Ionicons
                    name={SESSION_ICON[line.type]}
                    size={18}
                    color={SESSION_ACCENT[line.type]}
                  />
                  <Text style={styles.typicalName} numberOfLines={1}>
                    {sessionLabel(line.type)}
                  </Text>
                  <Text style={styles.typicalTime}>{formatClock(line.timeHHmm)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {insights.late.map((sug) => (
            <View key={sug.type} style={[styles.insightCard, styles.premiumCard, styles.insightCardAccent, isIosUi && ios.iosGroupedCard]}>
              <View style={styles.insightCardHead}>
                <View style={[styles.insightIconCircle, styles.insightIconWarm]}>
                  <Ionicons name="bulb" size={20} color="#C27C1A" />
                </View>
                <View style={styles.insightHeadText}>
                  <Text style={styles.insightCardTitle}>{t('brushingInsightLateTitle')}</Text>
                </View>
              </View>
              <Text style={styles.lateBody}>
                {t('brushingInsightLateLine')
                  .replace('{name}', sessionLabel(sug.type))
                  .replace('{minutes}', String(sug.avgLateMinutes))
                  .replace('{current}', formatClock(sug.currentSchedule))
                  .replace('{suggested}', formatClock(sug.suggestedSchedule))}
              </Text>
              <View style={styles.settingsHintRow}>
                <Ionicons name="settings-outline" size={16} color={colors.muted} />
                <Text style={styles.settingsHint}>{t('brushingInsightSettingsHint')}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('brushingAnalyticsByDay')}</Text>
      </View>

      {rows.map((row) => {
        const perfect = row.percent >= 100 && row.planned > 0;
        const barTint =
          row.percent >= 100
            ? colors.success
            : row.percent >= 50
              ? colors.primary
              : row.percent > 0
                ? colors.warning
                : colors.muted;

        return (
          <View
            key={row.dateKey}
            style={[
              styles.dayCard,
              styles.premiumCard,
              isIosUi && ios.iosGroupedCard,
              perfect && styles.dayCardPerfect,
            ]}
          >
            <View style={styles.dayTopRow}>
              <View style={styles.dotsColumn}>
                {plannedTypesList.map((type) => {
                  const ok =
                    type === 'morning'
                      ? row.hadMorning
                      : type === 'midday'
                        ? row.hadMidday
                        : row.hadEvening;
                  return (
                    <View
                      key={type}
                      style={[
                        styles.sessionDot,
                        { borderColor: SESSION_ACCENT[type] + (ok ? '' : '55') },
                        ok && { backgroundColor: SESSION_ACCENT[type] },
                        !ok && styles.sessionDotEmpty,
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.dayMain}>
                <View style={styles.dayTitleRow}>
                  <Text style={[styles.dayLabel, row.isToday && styles.dayLabelToday]}>{row.label}</Text>
                  {row.isToday ? (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>{t('brushingAnalyticsToday')}</Text>
                    </View>
                  ) : null}
                  {perfect ? (
                    <View style={styles.perfectPill}>
                      <Ionicons name="trophy" size={12} color="#B8860B" />
                      <Text style={styles.perfectPillText}>{t('brushingAnalyticsPerfectDay')}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${row.percent}%`,
                        backgroundColor: barTint,
                        minWidth: row.percent > 0 ? 4 : 0,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dayMeta}>
                  {t('brushingAnalyticsSessionsShort')
                    .replace('{n}', String(row.completed))
                    .replace('{m}', String(row.planned))}{' '}
                  · {row.percent}%
                </Text>
              </View>

              <View style={[styles.percentRing, { borderColor: barTint + '44' }]}>
                <Text style={[styles.percentRingInner, { color: barTint }]}>
                  {row.percent}
                  <Text style={styles.percentRingSuffix}>%</Text>
                </Text>
              </View>
            </View>

            <View style={styles.chipsRow}>
              {plannedTypesList.map((type) => {
                const ok =
                  type === 'morning'
                    ? row.hadMorning
                    : type === 'midday'
                      ? row.hadMidday
                      : row.hadEvening;
                const accent = SESSION_ACCENT[type];
                return (
                  <View
                    key={type}
                    style={[
                      styles.sessionChip,
                      ok ? { backgroundColor: accent + '22', borderColor: accent + '99' } : styles.sessionChipMiss,
                    ]}
                  >
                    <Ionicons
                      name={SESSION_ICON[type]}
                      size={17}
                      color={ok ? accent : colors.muted}
                    />
                    <Text
                      style={[styles.sessionChipLabel, ok ? { color: colors.text } : styles.sessionChipLabelMiss]}
                      numberOfLines={1}
                    >
                      {sessionLabel(type)}
                    </Text>
                    {ok ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={16} color={colors.muted} />
                    )}
                  </View>
                );
              })}
            </View>

            {row.points > 0 ? (
              <View style={styles.pointsRow}>
                <Ionicons name="star" size={16} color={colors.primary} />
                <Text style={styles.pointsLine}>
                  {t('brushingAnalyticsPointsDay').replace('{n}', String(row.points))}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: ui.screenPadding, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  muted: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  premiumCard: {
    borderRadius: ui.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  summaryRow: {
    backgroundColor: colors.card,
    marginBottom: 22,
  },
  summaryCardShell: {
    overflow: 'hidden',
  },
  summaryAccent: {
    height: 3,
    width: '100%',
    backgroundColor: colors.primary,
    opacity: 0.95,
  },
  summaryRowInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 18,
  },
  summaryCell: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  summaryIconWrap: {
    marginBottom: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + '28',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
      },
      default: {},
    }),
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginVertical: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '700',
    lineHeight: 16,
  },
  insightsWrap: { gap: 14, marginBottom: 22 },
  insightCard: {
    backgroundColor: colors.card,
    padding: 16,
  },
  insightCardAccent: {
    borderColor: colors.warning + '55',
    backgroundColor: colors.warningLight + 'AA',
    borderWidth: StyleSheet.hairlineWidth,
  },
  insightCardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  insightIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconWarm: { backgroundColor: colors.warningLight },
  insightHeadText: { flex: 1, minWidth: 0 },
  insightCardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  insightCardSub: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },
  insightIntro: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  typicalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  typicalRowSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  typicalName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 0 },
  typicalTime: { fontSize: 15, fontWeight: '800', color: colors.primary },
  lateBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
    fontWeight: '500',
  },
  settingsHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  settingsHint: { fontSize: 12, color: colors.muted, fontWeight: '600', flex: 1 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  dayCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  dayCardPerfect: {
    borderColor: colors.warning + '66',
    borderWidth: 1.5,
  },
  dayTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dotsColumn: { justifyContent: 'center', gap: 6, paddingTop: 4 },
  sessionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  sessionDotEmpty: {
    backgroundColor: colors.background,
  },
  dayMain: { flex: 1, minWidth: 0 },
  dayTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dayLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  dayLabelToday: { color: colors.primaryDark },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  perfectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.warningLight,
  },
  perfectPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B8860B',
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  dayMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  percentRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  percentRingInner: {
    fontSize: 16,
    fontWeight: '800',
  },
  percentRingSuffix: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    minWidth: 100,
    maxWidth: '48%',
  },
  sessionChipMiss: {
    backgroundColor: colors.background,
    borderColor: colors.cardBorder,
  },
  sessionChipLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 0,
  },
  sessionChipLabelMiss: {
    color: colors.muted,
    fontWeight: '600',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  pointsLine: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
