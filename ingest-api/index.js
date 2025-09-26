"use strict";

const express = require("express");
const { PubSub } = require("@google-cloud/pubsub");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const app = express();
app.use(express.json({ limit: "1mb" }));

const port = process.env.PORT || 8080;
const pubsub = new PubSub();
const pubsubTopicName = process.env.PUBSUB_TOPIC || "security-logs";

const ajv = new Ajv({ allErrors: true, removeAdditional: true, useDefaults: true });
addFormats(ajv);
const logSchema = {
	type: "object",
	additionalProperties: false,
	required: ["customerId", "userId", "event", "ip", "device"],
	properties: {
		customerId: { type: "string", minLength: 1 },
		userId: { type: "string", minLength: 1 },
		event: { type: "string", minLength: 1 },
		ip: { type: "string", minLength: 3 },
		device: { type: "string", minLength: 1 },
		metadata: { type: "object", additionalProperties: true },
		eventTime: { type: ["string", "null"], format: "date-time" }
	}
};
const validate = ajv.compile(logSchema);

app.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok" });
});

app.post("/api/logs", async (req, res) => {
	const payload = req.body;
	if (!validate(payload)) {
		return res.status(400).json({ error: "invalid_payload", details: validate.errors });
	}

	const enriched = {
		...payload,
		receivedAt: new Date().toISOString(),
		eventTime: payload.eventTime || new Date().toISOString(),
		userAgent: req.get("user-agent") || undefined,
		requestIp: req.ip
	};

	// Publish to Pub/Sub but do not block response for local/dev usability
	try {
		const topic = pubsub.topic(pubsubTopicName);
		// Fire and forget; log outcome asynchronously
		topic.publishMessage({ json: enriched })
			.then((messageId) => console.log("Published message", { messageId }))
			.catch((err) => console.error("Publish error", err));
	} catch (err) {
		console.error("Publish setup error", err);
	}
	return res.status(202).json({ status: "queued" });
});

app.listen(port, () => {
	console.log(`ingest-api listening on ${port}`);
});


