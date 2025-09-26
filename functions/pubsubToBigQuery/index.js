"use strict";

const { BigQuery } = require("@google-cloud/bigquery");

const bigquery = new BigQuery();
const datasetId = process.env.BQ_DATASET || "security";
const tableId = process.env.BQ_TABLE || "logs";

// Entry point: processLog
// Trigger: Pub/Sub (topic: security-logs)
exports.processLog = async (message) => {
	try {
		const dataBuffer = message.data ? Buffer.from(message.data, "base64") : null;
		if (!dataBuffer) {
			console.error("No message data");
			return;
		}
		const payload = JSON.parse(dataBuffer.toString());

		const row = {
			customerId: payload.customerId,
			userId: payload.userId,
			event: payload.event,
			ip: payload.ip,
			device: payload.device,
			metadata: payload.metadata || null,
			userAgent: payload.userAgent || null,
			requestIp: payload.requestIp || null,
			receivedAt: payload.receivedAt || new Date().toISOString(),
			eventTime: payload.eventTime || payload.receivedAt || new Date().toISOString()
		};

		await bigquery.dataset(datasetId).table(tableId).insert([row]);
		console.log("Inserted row into BigQuery", { table: `${datasetId}.${tableId}` });
	} catch (err) {
		console.error("processLog error", err);
		throw err;
	}
};


