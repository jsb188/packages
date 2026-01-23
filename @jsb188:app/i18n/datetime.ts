export default {
	en: {
    // General
    year_: 'Year: %{year}',

		// Times count
		weeks_ct: '%{smart_count} week||||%{smart_count} weeks',
		days_ct: '%{smart_count} day||||%{smart_count} days',
		hours_ct: '%{smart_count} hour||||%{smart_count} hours',
		minutes_ct: '%{smart_count} minute||||%{smart_count} minutes',
		seconds_ct: '%{smart_count} second||||%{smart_count} seconds',

		// Ago
		just_now: 'just now',
		in_minutes_ct: 'in %{smart_count} minute||||in %{smart_count} minutes',
		in_hours_ct: 'in %{smart_count} hour||||in %{smart_count} hours',
		minutes_ago_ct: '%{smart_count} minute ago||||%{smart_count} minutes ago',
		hours_ago_ct: '%{smart_count} hour ago||||%{smart_count} hours ago',
		weeks_ago_ct: '%{smart_count} week ago||||%{smart_count} weeks ago',
		months_ago_ct: '%{smart_count} month ago||||%{smart_count} months ago',

		// Time period
		period_TOMORROW: 'Tomorrow',
		period_TODAY: 'Today',
		period_YESTERDAY: 'Yesterday',
		period_THIS_WEEK: 'This week',
		period_THIS_MONTH: 'This month',
		period_LAST_WEEK: 'Last week',
		period_LAST_MONTH: 'Last month',
		period_OLDER: 'History',
		period_UPCOMING: 'Upcoming',

    // Schedule
    schedule: {
      ONCE_fixed: 'Once on %{date}',
      DAILY_fixed: 'Recurring every %{value} day', // Unused atm
      WEEKLY_fixed: 'Recurring every %{value} week',
      MONTHLY_fixed: 'Recurring every %{value} month', // Unused atm
      YEARLY_fixed: 'Recurring every %{value} year', // Unused atm

      ONCE: 'Once on %{date}',
      DAILY: 'Recurring every day', // Unused atm
      WEEKLY: 'Recurring every week',
      MONTHLY: 'Recurring every month', // Unused atm
      YEARLY: 'Recurring every year', // Unused atm

      _on_: ' on %{daysOfWeek}'
    },

    daysOfWeek: {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    }
  },
};
