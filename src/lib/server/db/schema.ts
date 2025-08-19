import { pgTable, serial, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Requests table - stores user queries
export const requests = pgTable('requests', {
	id: text('id').primaryKey(), // UUID generated on client
	sdk: text('sdk').notNull(), // e.g., 'sentry-javascript', 'sentry-python'
	version: text('version').notNull(), // e.g., '7.0.0'
	description: text('description').notNull(), // User's issue description
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Results table - stores analysis results
export const results = pgTable('results', {
	id: serial('id').primaryKey(),
	requestId: text('request_id')
		.references(() => requests.id)
		.notNull(),
	status: text('status', { enum: ['fixed', 'not_fixed', 'unknown'] }).notNull(),
	confidence: integer('confidence').notNull(), // 0-100 confidence score
	summary: text('summary'), // Brief summary of the fix
	prs: jsonb('prs'), // Array of PR objects with details
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Cache table - stores GitHub API responses and parsed data
export const cache = pgTable('cache', {
	id: serial('id').primaryKey(),
	key: text('key').notNull().unique(), // Cache key (hash of request params)
	data: jsonb('data').notNull(), // Cached response data
	expiresAt: timestamp('expires_at').notNull()
});

// Progress table - tracks real-time analysis progress
export const progress = pgTable('progress', {
	id: serial('id').primaryKey(),
	requestId: text('request_id')
		.references(() => requests.id)
		.notNull(),
	currentStep: integer('current_step').notNull().default(0),
	totalSteps: integer('total_steps').notNull().default(5),
	stepTitle: text('step_title').notNull().default('Starting analysis...'),
	stepDescription: text('step_description'),
	isCompleted: integer('is_completed').notNull().default(0), // 0 = false, 1 = true (SQLite compatibility)
	error: text('error'), // Store any error that occurred
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const requestsRelations = relations(requests, ({ one }) => ({
	result: one(results, {
		fields: [requests.id],
		references: [results.requestId]
	}),
	progress: one(progress, {
		fields: [requests.id],
		references: [progress.requestId]
	})
}));

export const resultsRelations = relations(results, ({ one }) => ({
	request: one(requests, {
		fields: [results.requestId],
		references: [requests.id]
	})
}));

export const progressRelations = relations(progress, ({ one }) => ({
	request: one(requests, {
		fields: [progress.requestId],
		references: [requests.id]
	})
}));

// Types
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;
export type Cache = typeof cache.$inferSelect;
export type NewCache = typeof cache.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
