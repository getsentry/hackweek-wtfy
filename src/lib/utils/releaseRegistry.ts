interface SdkData {
	canonical: string;
	name: string;
	repo: string;
	repo_url: string;
	latestVersion: string;
}

interface ReleaseRegistrySdksEntry {
	name: string;
	repo_url: string;
	version: string;
}

export async function getReleaseRegistryVersions(fetch: typeof globalThis.fetch, sdk: string) {
	if (!sdk) {
		return [];
	}

	if (sdk === 'sentry.javascript') {
		sdk = 'sentry.javascript.browser';
	}

	const url = `https://release-registry.services.sentry.io/sdks/${sdk}/versions`;
	const releaseRegistryResponse = await fetch(url);
	const versionsJson = (await releaseRegistryResponse.json()) as { versions: string[] };

	return versionsJson.versions;
}

export async function getReleaseRegistryHighLevelSdks(fetch: typeof globalThis.fetch) {
	const releaseRegistryResponse = await fetch('https://release-registry.services.sentry.io/sdks');

	const sdksJson = (await releaseRegistryResponse.json()) as Record<
		string,
		ReleaseRegistrySdksEntry
	>;

	console.log(sdksJson);

	const highLevelSdksMap = new Map<string, SdkData>();
	for (const [key, value] of Object.entries(sdksJson)) {
		const parts = key.split('.');
		const highLevelSdkKey = `${parts[0]}.${parts[1]}`;

		if (handleSpecialSnowflakes(key, value, highLevelSdksMap)) {
			continue;
		}

		if (highLevelSdksMap.has(highLevelSdkKey)) {
			continue;
		}

		const sdkData = {
			canonical: highLevelSdkKey,
			name: getProperSdkName(highLevelSdkKey, value.name),
			repo_url: value.repo_url,
			repo: repoFromUrl(value.repo_url),
			latestVersion: value.version
		};

		highLevelSdksMap.set(highLevelSdkKey, sdkData);
	}

	console.log({ highLevelSdksMap });

	return Array.from(highLevelSdksMap.values());
}

function handleSpecialSnowflakes(
	key: string,
	value: ReleaseRegistrySdksEntry,
	highLevelSdksMap: Map<string, SdkData>
) {
	switch (key) {
		case 'sentry.javascript.react-native':
			highLevelSdksMap.set('sentry.javascript.react-native', {
				canonical: 'sentry.javascript.react-native',
				name: 'React Native',
				repo: repoFromUrl(value.repo_url),
				repo_url: value.repo_url,
				latestVersion: value.version
			});
			return true;
		case 'sentry.javascript.cordova':
			highLevelSdksMap.set('sentry.javascript.cordova', {
				canonical: 'sentry.javascript.cordova',
				name: 'Cordova',
				repo: repoFromUrl(value.repo_url),
				repo_url: value.repo_url,
				latestVersion: value.version
			});
			return true;
		case 'sentry.javascript.capacitor':
			highLevelSdksMap.set('sentry.javascript.capacitor', {
				canonical: 'sentry.javascript.capacitor',
				name: 'Capacitor',
				repo: repoFromUrl(value.repo_url),
				repo_url: value.repo_url,
				latestVersion: value.version
			});
			return true;
		case 'sentry.javascript.lynx.react':
			highLevelSdksMap.set('sentry.javascript.lynx.react', {
				canonical: 'sentry.javascript.lynx.react',
				name: 'Lynx',
				repo: repoFromUrl(value.repo_url),
				repo_url: value.repo_url,
				latestVersion: value.version
			});
			return true;
	}
	return false;
}

function repoFromUrl(repoUrl: string) {
	return repoUrl.replace('https://github.com/', '');
}

function getProperSdkName(key: string, rawSdkName: string) {
	switch (key) {
		case 'sentry.javascript':
			return 'JavaScript SDKs';
		case 'sentry.java':
			return 'Java SDKs';
		case 'sentry.cocoa':
			return 'Cocoa SDK';
		case 'sentry.ruby':
			return 'Ruby SDK';
		case 'sentry.powershell':
			return 'Powershell SDK';
		case 'sentry.php':
			return 'PHP SDK';
		case 'sentry.kotlin':
			return 'Kotlin SDK';
		case 'sentry.elixir':
			return 'Elixir SDK';
		case 'sentry.dotnet':
			return '.NET SDKs';
	}
	return `${rawSdkName} SDK`;
}
