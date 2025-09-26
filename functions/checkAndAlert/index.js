"use strict";

const { BigQuery } = require("@google-cloud/bigquery");

// Email alerting (Gmail SMTP)
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS; // App Password, not regular password
const GMAIL_TO = process.env.GMAIL_TO;

const bigquery = new BigQuery();
const datasetId = process.env.BQ_DATASET || "security";
const tableId = process.env.BQ_TABLE || "logs";
const jobLocation = process.env.BQ_LOCATION || undefined; 
const failureThreshold = parseInt(process.env.FAILURE_THRESHOLD || "5", 10);
const windowMinutes = parseInt(process.env.WINDOW_MINUTES || "5", 10);

async function sendEmail(subject, text) {
	if (!GMAIL_USER || !GMAIL_PASS || !GMAIL_TO) {
		console.log("Gmail not configured. Skipping alert.", { subject });
		return;
	}
	
	const nodemailer = require("nodemailer");
	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: GMAIL_USER,
			pass: GMAIL_PASS
		}
	});
	
	const mailOptions = {
		from: GMAIL_USER,
		to: GMAIL_TO,
		subject: subject,
		text: text
	};
	
	await transporter.sendMail(mailOptions);
	console.log("Email sent successfully");
}

// Entry point: runDetection (HTTP)
exports.runDetection = async (req, res) => {
	try {
		const projectId = bigquery.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
		const query = `
			SELECT customerId, userId, ip, COUNTIF(event = 'login_failed') AS failed_count,
			  ARRAY_AGG(eventTime ORDER BY eventTime DESC LIMIT 1)[OFFSET(0)] as last_event_time
			FROM \`${projectId}.${datasetId}.${tableId}\`
			WHERE event = 'login_failed' AND eventTime >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${windowMinutes} MINUTE)
			GROUP BY customerId, userId, ip
			HAVING failed_count >= ${failureThreshold}
		`;

		const [job] = await bigquery.createQueryJob({ query, useLegacySql: false, location: jobLocation });
		const [rows] = await job.getQueryResults();

		if (!rows || rows.length === 0) {
			console.log("No detections in window.");
			return res.status(200).json({ detections: 0 });
		}

		const text = `Brute-force suspicion: ${rows.length} principals exceeded ${failureThreshold} failed logins in ${windowMinutes}m.`;
		try {
			await sendEmail("Security Alert: Possible brute-force", text);
		} catch (emailErr) {
			console.error("Email send failed (non-fatal)", emailErr);
		}

		console.log("Detections:", rows);
		return res.status(200).json({ detections: rows.length, rows });
	} catch (err) {
		console.error("runDetection error", err);
		return res.status(500).json({ error: "detection_failed" });
	}
};


