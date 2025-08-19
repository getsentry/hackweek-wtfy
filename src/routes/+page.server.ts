import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		try {
			console.log('xx form action ');
			const formData = await request.formData();
			const data = {
				requestId: formData.get('requestId') as string,
				sdk: formData.get('sdk') as string,
				version: formData.get('version') as string,
				description: formData.get('description') as string
			};

			console.log('xx form action data', data);

			// Basic validation before calling API
			if (!data.requestId || !data.sdk || !data.version || !data.description) {
				return fail(400, {
					error: 'All fields are required'
				});
			}

			// Call the internal API endpoint
			const apiResponse = await fetch(`/api/analyze`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			if (!apiResponse.ok) {
				const errorText = await apiResponse.text();
				return fail(apiResponse.status, {
					error: errorText || 'Analysis failed'
				});
			}

			const result = await apiResponse.json();
			return { success: true, result, requestId: result.requestId };
		} catch (err) {
			console.error('Form action failed:', err);
			return fail(500, {
				error: 'Internal server error during analysis'
			});
		}
	}
};
