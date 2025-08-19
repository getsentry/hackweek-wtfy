/**
 * Simple markdown link parser for converting [text](url) to HTML links
 */
export function parseMarkdownLinks(text: string): string {
	if (!text) return '';

	// Regex to match markdown links: [text](url)
	const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

	// Replace markdown links with HTML anchor tags
	return text.replace(markdownLinkRegex, (match, linkText, url) => {
		// Basic URL validation
		const isValidUrl =
			url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');

		if (!isValidUrl) {
			// If not a valid URL, return the original text
			return match;
		}

		// Create HTML anchor tag with proper attributes
		return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline font-medium">${linkText}</a>`;
	});
}

/**
 * Enhanced markdown parser that also handles bold, italic, and code
 */
export function parseMarkdown(text: string): string {
	if (!text) return '';

	let parsed = text;

	// Parse markdown links first
	parsed = parseMarkdownLinks(parsed);

	// Parse **bold** text
	parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

	// Parse *italic* text
	parsed = parsed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

	// Parse `code` text
	parsed = parsed.replace(
		/`([^`]+)`/g,
		'<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
	);

	return parsed;
}

/**
 * Sanitize HTML to prevent XSS while allowing specific safe tags
 */
export function sanitizeHtml(html: string): string {
	// Basic sanitization - only allow specific safe tags and attributes
	const allowedTags = ['a', 'strong', 'em', 'code'];
	const allowedAttributes = ['href', 'target', 'rel', 'class'];

	// This is a simple implementation - in production you might want a proper HTML sanitizer
	return html.replace(/<(\/?)([\w-]+)([^>]*)>/g, (match, closing, tagName, attributes) => {
		if (!allowedTags.includes(tagName.toLowerCase())) {
			return ''; // Remove disallowed tags
		}

		if (closing) {
			return `</${tagName}>`;
		}

		// Filter attributes to only allowed ones
		const filteredAttributes = attributes.replace(
			/(\w+)="([^"]*)"/g,
			(attrMatch: string, name: string, value: string) => {
				if (allowedAttributes.includes(name.toLowerCase())) {
					return attrMatch;
				}
				return '';
			}
		);

		return `<${tagName}${filteredAttributes}>`;
	});
}
