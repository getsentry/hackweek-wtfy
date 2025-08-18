// SDK to GitHub repository mapping
export const SDK_REPOS = {
	'sentry-javascript': 'getsentry/sentry-javascript',
	'sentry-python': 'getsentry/sentry-python',
	'sentry-java': 'getsentry/sentry-java',
	'sentry-dotnet': 'getsentry/sentry-dotnet',
	'sentry-go': 'getsentry/sentry-go',
	'sentry-ruby': 'getsentry/sentry-ruby',
	'sentry-php': 'getsentry/sentry-php',
	'sentry-react-native': 'getsentry/sentry-react-native',
	'sentry-cocoa': 'getsentry/sentry-cocoa',
	'sentry-android': 'getsentry/sentry-android'
} as const;

export type SdkName = keyof typeof SDK_REPOS;

export function getRepoForSdk(sdk: string): string | null {
	return SDK_REPOS[sdk as SdkName] || null;
}

// Common SDK display names
export const SDK_LABELS = {
	'sentry-javascript': 'JavaScript SDK',
	'sentry-python': 'Python SDK',
	'sentry-java': 'Java SDK',
	'sentry-dotnet': '.NET SDK',
	'sentry-go': 'Go SDK',
	'sentry-ruby': 'Ruby SDK',
	'sentry-php': 'PHP SDK',
	'sentry-react-native': 'React Native SDK',
	'sentry-cocoa': 'iOS/macOS SDK',
	'sentry-android': 'Android SDK'
} as const;
