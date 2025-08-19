import * as Sentry from '@sentry/sveltekit';

console.log('Initializing Sentry');

Sentry.init({
	dsn: 'https://f9ad87a00149a3d6faea76ebfc2d1483@o447951.ingest.us.sentry.io/4509864603484160',
	tracesSampleRate: 1.0,
	enableLogs: true,
	integrations: [
		Sentry.httpIntegration({ disableIncomingRequestSpans: true }),
		Sentry.openAIIntegration({
			recordInputs: true,
			recordOutputs: true
		})
	],
	sendDefaultPii: true
	// debug: true
});

process.on('sveltekit:shutdown', () => {
	Sentry.close(2000);
	process.exit(0);
});
