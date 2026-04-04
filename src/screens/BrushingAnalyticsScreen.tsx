import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { colors, ui } from '../utils/colors';
import { IOS_GROUPED_BG, iosGroupedCard, isIosUi } from '../utils/iosUi';
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
      <View style={[styles.center, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}>
        <Text style={styles.muted}>{t('somethingWrong')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}
      contentContainerStyle={[styles.content, isIosUi && { paddingHorizontal: 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.screenTitle}>{t('brushingAnalyticsTitle')}</Text>
      <Text style={styles.screenSubtitle}>{t('brushingAnalyticsSubtitle')}</Text>

      <View style={[styles.summaryRow, isIosUi && iosGroupedCard]}>
        <View style={styles.summaryCell}>
          <View style={styles.summaryIconWrap}>
            <Ionicons name="analytics" size={22} color={colors.primary} />
          </View>
          <Text style={styles.summaryValue}>{avgPercent}%</Text>
          <Text style={styles.summaryLabel}>{t('brushingAnalyticsAvgCompletion')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <View style={styles.summaryIconWrap}>
            <Ionicons name="checkmark-done" size={22} color={colors.primary} />
          </View>
          <Text style={styles.summaryValue}>{totalCompleted}</Text>
          <Text style={styles.summaryLabel}>{t('brushingAnalyticsTotalSessions')}</Text>
        </View>
      </View>

      {insights.typical.length > 0 || insights.late.length > 0 ? (
        <View style={styles.insightsWrap}>
          {insights.typical.length > 0 ? (
            <View style={[styles.insightCard, isIosUi && iosGroupedCard]}>
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
            <View key={sug.type} style={[styles.insightCard, styles.insightCardAccent, isIosUi && iosGroupedCard]}>
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
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIconBg}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>{t('brushingAnalyticsByDay')}</Text>
        </View>
        <Text style={styles.sectionHint}>{t('brushingAnalyticsByDayHint')}</Text>
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
              isIosUi && iosGroupedCard,
              row.isToday && styles.dayCardToday,
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
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: ui.screenPadding, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  muted: { color: colors.muted, fontSize: 15 },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 18,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    paddingVertical: 16,
    marginBottom: 22,
  },
  summaryCell: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  summaryIconWrap: {
    marginBottom: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginVertical: 4,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  insightsWrap: { gap: 12, marginBottom: 20 },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    padding: 14,
  },
  insightCardAccent: {
    borderColor: colors.warning + '55',
    backgroundColor: colors.warningLight + 'AA',
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
  insightIconWarm: { backgroundColor: '#FEF3E2' },
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
  sectionHeader: { marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionHint: {
    marginTop: 6,
    marginLeft: 46,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  dayCard: {
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  dayCardToday: {
    borderColor: colors.primary + '55',
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  dayCardPerfect: {
    borderColor: colors.warning + '66',
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    borderRadius: 5,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  dayMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  percentRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
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
