export type OAuthUserStatsRow = {
  userId: string;
  email: string | null;
  firstSeenAt: number;
  lastSeenAt: number;
  loginCount: number;
};

export type UsageStatsSummary = {
  generatedAt: string;
  oauthUsers: {
    total: number;
    activeLast30Days: number;
    accounts: OAuthUserStatsRow[];
  };
  logins: {
    today: number;
    thisMonth: number;
    last30Days: number;
    avgPerDayLast30: number;
    avgPerMonthLast12: number;
  };
  videos: {
    today: number;
    thisMonth: number;
    last30Days: number;
    avgPerDayLast30: number;
    avgPerMonthLast12: number;
    oauthLast30Days: number;
    guestLast30Days: number;
  };
  screenTime: {
    sessionsLast30Days: number;
    avgSessionSecondsLast30: number;
    avgSessionSecondsThisMonth: number;
    totalHoursLast30: number;
  };
};
